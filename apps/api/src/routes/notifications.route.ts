// Rotas de notificações — o sininho.
//
// GET  /notifications           — notificações do próprio usuário na
//                                 organização ativa, mais recentes primeiro,
//                                 com a contagem de não lidas. Gera antes os
//                                 lembretes de prazo que faltam (ver
//                                 ListNotificationsUseCase).
// POST /notifications/:id/read  — marca uma como lida.
// POST /notifications/read-all  — marca todas como lidas.
//
// Sem permissão específica: cada usuário só enxerga as próprias notificações
// (o filtro por userId fica no repository).

import type {
  IAuthProvider,
  IMembershipRepository,
  INotificationRepository,
  IOrganizationRepository,
  IUserRepository,
} from '@sylocrm/application'
import { ListNotificationsUseCase } from '@sylocrm/application'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { createTenantMiddleware } from '../middleware/tenant.middleware'

interface NotificationsRouteOptions {
  authProvider: IAuthProvider
  membershipRepository: IMembershipRepository
  organizationRepository: IOrganizationRepository
  userRepository: IUserRepository
  notificationRepository: INotificationRepository
}

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
})

export const notificationsRoute: FastifyPluginAsync<NotificationsRouteOptions> = async (
  fastify,
  options,
) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(
    options.membershipRepository,
    options.userRepository,
    options.organizationRepository,
  )
  const listNotifications = new ListNotificationsUseCase(options.notificationRepository)

  // ── GET /notifications ────────────────────────────────────────────────────
  fastify.get(
    '/notifications',
    { preHandler: [authMiddleware, tenantMiddleware] },
    async (request, reply) => {
      const parsed = listQuerySchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados inválidos.',
          code: 'VALIDATION_ERROR',
          status: 400,
          details: parsed.error.flatten().fieldErrors,
        })
      }

      const context = request.authContext as NonNullable<typeof request.authContext>
      const result = await listNotifications.execute({
        userId: context.userId,
        organizationId: context.currentMembership.organizationId,
        limit: Math.min(MAX_LIMIT, parsed.data.limit ?? DEFAULT_LIMIT),
      })

      return {
        unreadCount: result.unreadCount,
        items: result.items.map((item) => ({
          ...item,
          readAt: item.readAt?.toISOString() ?? null,
          createdAt: item.createdAt.toISOString(),
          task: item.task
            ? {
                ...item.task,
                dueAt: item.task.dueAt.toISOString(),
                createdAt: item.task.createdAt.toISOString(),
                updatedAt: item.task.updatedAt.toISOString(),
              }
            : null,
        })),
      }
    },
  )

  // ── POST /notifications/read-all ──────────────────────────────────────────
  // Registrada antes de /:id/read só por legibilidade — o find-my-way do
  // Fastify já prioriza o segmento estático.
  fastify.post(
    '/notifications/read-all',
    { preHandler: [authMiddleware, tenantMiddleware] },
    async (request, reply) => {
      const context = request.authContext as NonNullable<typeof request.authContext>
      await options.notificationRepository.markAllRead({
        userId: context.userId,
        organizationId: context.currentMembership.organizationId,
      })
      return reply.status(204).send()
    },
  )

  // ── POST /notifications/:id/read ──────────────────────────────────────────
  fastify.post<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: [authMiddleware, tenantMiddleware] },
    async (request, reply) => {
      if (!z.string().uuid().safeParse(request.params.id).success) {
        return reply.status(404).send(notificationNotFoundResponse())
      }

      const context = request.authContext as NonNullable<typeof request.authContext>
      const updated = await options.notificationRepository.markRead(request.params.id, {
        userId: context.userId,
        organizationId: context.currentMembership.organizationId,
      })

      if (!updated) {
        return reply.status(404).send(notificationNotFoundResponse())
      }
      return reply.status(204).send()
    },
  )
}

function notificationNotFoundResponse() {
  return { error: 'Notificação não encontrada.', code: 'NOTIFICATION_NOT_FOUND', status: 404 }
}
