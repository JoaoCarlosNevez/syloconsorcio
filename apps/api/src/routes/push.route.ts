// Rotas do Web Push — inscrição dos aparelhos (app do celular, /m).
//
// GET    /push/public-key     — chave VAPID pública que o navegador usa pra
//                               se inscrever; null = push desligado no servidor.
// POST   /push/subscriptions  — inscreve o aparelho do usuário logado.
// DELETE /push/subscriptions  — remove (logout, push desligado no app).
//
// Só authMiddleware: a inscrição é do usuário, não de uma organização — o
// push de qualquer organização dele chega no mesmo aparelho.

import type { IAuthProvider, IPushSubscriptionRepository } from '@sylocrm/application'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createAuthMiddleware } from '../middleware/auth.middleware'

interface PushRouteOptions {
  authProvider: IAuthProvider
  pushSubscriptionRepository: IPushSubscriptionRepository
  vapidPublicKey: string | null
}

const endpointSchema = z.string().url().max(2048)

const subscribeSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
})

const unsubscribeSchema = z.object({ endpoint: endpointSchema })

export const pushRoute: FastifyPluginAsync<PushRouteOptions> = async (fastify, options) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)

  fastify.get('/push/public-key', { preHandler: [authMiddleware] }, async () => ({
    publicKey: options.vapidPublicKey,
  }))

  fastify.post('/push/subscriptions', { preHandler: [authMiddleware] }, async (request, reply) => {
    const parsed = subscribeSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Inscrição de push inválida.',
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten().fieldErrors,
      })
    }
    const identity = request.authIdentity as NonNullable<typeof request.authIdentity>
    const userAgent = request.headers['user-agent']
    await options.pushSubscriptionRepository.save({
      userId: identity.id,
      endpoint: parsed.data.endpoint,
      keys: parsed.data.keys,
      userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 512) : null,
    })
    return reply.status(204).send()
  })

  fastify.delete(
    '/push/subscriptions',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const parsed = unsubscribeSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Endpoint inválido.',
          code: 'VALIDATION_ERROR',
          status: 400,
        })
      }
      const identity = request.authIdentity as NonNullable<typeof request.authIdentity>
      await options.pushSubscriptionRepository.remove(identity.id, parsed.data.endpoint)
      return reply.status(204).send()
    },
  )
}
