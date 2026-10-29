// Rotas públicas do app do celular (PWA) — marca da organização no app
// instalado. Públicas porque o celular busca o manifest e os ícones sem o
// token de login; só expõem o que a própria organização já mostra (nome,
// ícone e cor do White Label), e só pelo id (UUID) dela.
//
// GET /pwa/manifest?org=<id>&origin=<app>  — manifest com nome/ícone/cor
//     (origin precisa estar no CORS_ORIGIN: é o endereço do app)
// GET /pwa/icon/:org/:size.png              — ícone quadrado em PNG (180,
//     192 ou 512), gerado do ícone do White Label (SVG/PNG/WEBP de qualquer
//     proporção, centralizado em fundo branco)

import rateLimit from '@fastify/rate-limit'
import type { IOrganizationRepository } from '@sylocrm/application'
import type { FastifyPluginAsync } from 'fastify'
import sharp from 'sharp'
import { z } from 'zod'
import {
  PWA_ICON_SIZES,
  type PwaIconSize,
  buildPwaManifest,
  hasPwaBranding,
} from '../lib/pwa-manifest'

interface PwaRouteOptions {
  organizationRepository: IOrganizationRepository
  /** Endereços do app aceitos (CORS_ORIGIN). */
  allowedOrigins: readonly string[]
}

const UUID = z.string().uuid()
const MAX_SOURCE_BYTES = 2 * 1024 * 1024
const ONE_DAY_SECONDS = 24 * 60 * 60

/** Ícones já gerados, por URL de origem + tamanho — o ícone muda raramente. */
const iconCache = new Map<string, Buffer>()
const ICON_CACHE_LIMIT = 100

async function renderIcon(sourceUrl: string, size: PwaIconSize): Promise<Buffer> {
  const key = `${sourceUrl}@${size}`
  const cached = iconCache.get(key)
  if (cached) return cached

  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(5000) })
  if (!response.ok) throw new Error(`ícone respondeu ${response.status}`)
  const source = Buffer.from(await response.arrayBuffer())
  if (source.byteLength > MAX_SOURCE_BYTES) throw new Error('ícone grande demais')

  // 80% do quadrado: o celular corta as bordas (ícone redondo no Android).
  const inner = Math.round(size * 0.8)
  const logo = await sharp(source, { density: 300 })
    .resize(inner, inner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer()
  const png = await sharp({
    create: { width: size, height: size, channels: 4, background: '#ffffff' },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer()

  if (iconCache.size >= ICON_CACHE_LIMIT) {
    const oldest = iconCache.keys().next().value
    if (oldest) iconCache.delete(oldest)
  }
  iconCache.set(key, png)
  return png
}

export const pwaRoute: FastifyPluginAsync<PwaRouteOptions> = async (fastify, options) => {
  await fastify.register(rateLimit, { global: false })
  const rateLimitConfig = { rateLimit: { max: 60, timeWindow: 60_000 } }

  fastify.get<{ Querystring: { org?: string; origin?: string } }>(
    '/pwa/manifest',
    { config: rateLimitConfig },
    async (request, reply) => {
      const origin = request.query.origin ?? ''
      if (!options.allowedOrigins.includes(origin)) {
        return reply.status(400).send({
          error: 'Endereço do app não reconhecido.',
          code: 'PWA_ORIGIN_NOT_ALLOWED',
          status: 400,
        })
      }
      const orgId = UUID.safeParse(request.query.org)
      const organization = orgId.success
        ? await options.organizationRepository.findById(orgId.data)
        : null
      const apiBaseUrl = `${request.protocol}://${request.host}`
      return reply
        .header('Content-Type', 'application/manifest+json; charset=utf-8')
        .header('Cache-Control', 'public, max-age=3600')
        .send(buildPwaManifest({ appOrigin: origin, apiBaseUrl, organization }))
    },
  )

  fastify.get<{ Params: { org: string; size: string } }>(
    '/pwa/icon/:org/:size',
    { config: rateLimitConfig },
    async (request, reply) => {
      const notFound = { error: 'Ícone não encontrado.', code: 'PWA_ICON_NOT_FOUND', status: 404 }
      const size = Number(request.params.size.replace(/\.png$/, ''))
      const orgId = UUID.safeParse(request.params.org)
      if (!orgId.success || !PWA_ICON_SIZES.includes(size as PwaIconSize)) {
        return reply.status(404).send(notFound)
      }
      const organization = await options.organizationRepository.findById(orgId.data)
      const iconUrl = organization?.branding?.iconUrl
      if (!organization || !hasPwaBranding(organization) || !iconUrl) {
        return reply.status(404).send(notFound)
      }
      try {
        const png = await renderIcon(iconUrl, size as PwaIconSize)
        return reply
          .header('Content-Type', 'image/png')
          .header('Cache-Control', `public, max-age=${ONE_DAY_SECONDS}`)
          .send(png)
      } catch (error) {
        request.log.warn({ err: error, organizationId: organization.id }, 'pwa icon failed')
        return reply.status(404).send(notFound)
      }
    },
  )
}
