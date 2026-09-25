// Rota do log de atividades — tela Configurações > Atividade.
//
// GET /activity — eventos da organização ativa, mais recentes primeiro,
//                 paginados. `entityType` filtra por categoria (lead, task,
//                 funnel, team, organization). Exige activity.read (Dono e
//                 Supervisor — ver auth/permissions.ts).
//
// Os eventos são gravados pelos use cases (IActivityLogRepository) e, nas
// configurações da organização, pela própria rota — ver
// organization-settings.route.ts.

import type {
  IActivityLogRepository,
  IAuthProvider,
  IMembershipRepository,
  IOrganizationRepository,
  IUserRepository,
} from '@sylocrm/application'
import { Permission } from '@sylocrm/domain'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'
import { createTenantMiddleware } from '../middleware/tenant.middleware'

interface ActivityRouteOptions {
  authProvider: IAuthProvider
  membershipRepository: IMembershipRepository
  organizationRepository: IOrganizationRepository
  userRepository: IUserRepository
  activityLogRepository: IActivityLogRepository
}

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 30

const listQuerySchema = z.object({
  entityType: z.enum(['lead', 'task', 'funnel', 'team', 'organization']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
})

export const activityRoute: FastifyPluginAsync<ActivityRouteOptions> = async (fastify, options) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(
    options.membershipRepository,
    options.userRepository,
    options.organizationRepository,
  )

  // ── GET /activity ─────────────────────────────────────────────────────────
  fastify.get(
    '/activity',
    {
      preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.ACTIVITY_READ)],
    },
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
      const page = parsed.data.page ?? 1
      const pageSize = Math.min(MAX_PAGE_SIZE, parsed.data.pageSize ?? DEFAULT_PAGE_SIZE)

      const result = await options.activityLogRepository.list(
        {
          organizationId: context.currentMembership.organizationId,
          entityType: parsed.data.entityType,
        },
        page,
        pageSize,
      )

      return {
        ...result,
        items: result.items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
      }
    },
  )
}
