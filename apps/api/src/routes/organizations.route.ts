// Rotas de organizações — painel de Administração do Super Admin da plataforma.
//
// POST  /organizations             — cria uma Representação independente + dono (ADMIN)
// GET   /organizations             — lista todas as organizações
// PATCH /organizations/:id         — edita nome
// POST  /organizations/:id/icon    — envia o ícone (upload para Supabase Storage)
// GET   /organizations/:id/members — lista a equipe de uma organização qualquer
//
// Todas exigem authMiddleware + requirePlatformAdmin — não são escopadas por
// tenant (o Super Admin não precisa ser membro da organização-alvo).

import type {
  IAuthProvider,
  IMembershipRepository,
  IOrganizationRepository,
  IStorageProvider,
  IUserRepository,
} from '@sylocrm/application'
import { CreateRepresentationUseCase } from '@sylocrm/application'
import { ConflictError } from '@sylocrm/domain'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { requirePlatformAdmin } from '../middleware/platform-admin.middleware'

interface OrganizationsRouteOptions {
  authProvider: IAuthProvider
  userRepository: IUserRepository
  organizationRepository: IOrganizationRepository
  membershipRepository: IMembershipRepository
  storageProvider: IStorageProvider
}

const ICON_BUCKET = 'organization-icons'
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

const createRepresentationSchema = z.object({
  organizationName: z.string().min(1),
  ownerName: z.string().min(1),
  ownerEmail: z.string().email(),
})

const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  isWhiteLabel: z.boolean().optional(),
})

function validationErrorResponse(fieldErrors: Record<string, string[] | undefined>) {
  return { error: 'Dados inválidos.', code: 'VALIDATION_ERROR', status: 400, details: fieldErrors }
}

function organizationNotFoundResponse() {
  return { error: 'Organização não encontrada.', code: 'ORGANIZATION_NOT_FOUND', status: 404 }
}

export const organizationsRoute: FastifyPluginAsync<OrganizationsRouteOptions> = async (
  fastify,
  options,
) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const platformAdminMiddleware = requirePlatformAdmin(options.userRepository)

  const createRepresentation = new CreateRepresentationUseCase(
    options.authProvider,
    options.userRepository,
    options.organizationRepository,
    options.membershipRepository,
  )

  // ── GET /organizations ────────────────────────────────────────────────────
  fastify.get(
    '/organizations',
    { preHandler: [authMiddleware, platformAdminMiddleware] },
    async () => {
      const organizations = await options.organizationRepository.list()
      return { organizations }
    },
  )

  // ── POST /organizations ───────────────────────────────────────────────────
  fastify.post(
    '/organizations',
    { preHandler: [authMiddleware, platformAdminMiddleware] },
    async (request, reply) => {
      const parsed = createRepresentationSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send(validationErrorResponse(parsed.error.flatten().fieldErrors))
      }

      try {
        const result = await createRepresentation.execute(parsed.data)
        return reply.status(201).send({
          organization: result.organization,
          owner: {
            id: result.owner.id,
            email: result.owner.email,
            temporaryPassword: result.owner.temporaryPassword,
          },
        })
      } catch (error) {
        if (error instanceof ConflictError) {
          return reply.status(409).send({ error: error.message, code: error.code, status: 409 })
        }
        throw error
      }
    },
  )

  // ── PATCH /organizations/:id ──────────────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    '/organizations/:id',
    { preHandler: [authMiddleware, platformAdminMiddleware] },
    async (request, reply) => {
      const parsed = updateOrganizationSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send(validationErrorResponse(parsed.error.flatten().fieldErrors))
      }

      const organization = await options.organizationRepository.update(
        request.params.id,
        parsed.data,
      )
      if (!organization) {
        return reply.status(404).send(organizationNotFoundResponse())
      }
      return { organization }
    },
  )

  // ── POST /organizations/:id/icon ──────────────────────────────────────────
  fastify.post<{ Params: { id: string } }>(
    '/organizations/:id/icon',
    { preHandler: [authMiddleware, platformAdminMiddleware] },
    async (request, reply) => {
      const organization = await options.organizationRepository.findById(request.params.id)
      if (!organization) {
        return reply.status(404).send(organizationNotFoundResponse())
      }

      const file = await request.file()
      if (!file) {
        return reply
          .status(400)
          .send({ error: 'Nenhum arquivo enviado.', code: 'VALIDATION_ERROR', status: 400 })
      }

      const extension = EXTENSION_BY_MIME[file.mimetype]
      if (!extension) {
        return reply.status(400).send({
          error: 'Formato de imagem não suportado. Use PNG, JPEG, WEBP ou SVG.',
          code: 'VALIDATION_ERROR',
          status: 400,
        })
      }

      const buffer = await file.toBuffer()
      const { url } = await options.storageProvider.uploadPublicFile({
        bucket: ICON_BUCKET,
        path: `${organization.id}/icon.${extension}`,
        data: buffer,
        contentType: file.mimetype,
      })

      const updated = await options.organizationRepository.update(organization.id, {
        branding: { ...organization.branding, iconUrl: url },
      })

      return { organization: updated }
    },
  )

  // ── GET /organizations/:id/members ────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/organizations/:id/members',
    { preHandler: [authMiddleware, platformAdminMiddleware] },
    async (request) => {
      const members = await options.membershipRepository.findActiveByOrganizationId(
        request.params.id,
      )
      return { members }
    },
  )
}
