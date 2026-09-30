// Rotas do painel do início.
//
// GET /dashboard/me/monthly — números do mês do próprio usuário na organização
//                             ativa: agendamentos (Reuniões com prazo no mês),
//                             visitas realizadas (dessas, as concluídas), valor
//                             ganho e tíquete médio. Qualquer papel — só olha
//                             os dados de quem está logado.
//
// Roda authMiddleware → tenantMiddleware.

import type {
  IAuthProvider,
  ILeadRepository,
  IMembershipRepository,
  IOrganizationRepository,
  ITaskRepository,
  IUserRepository,
} from '@sylocrm/application'
import { GetMyMonthlyStatsUseCase } from '@sylocrm/application'
import type { FastifyPluginAsync } from 'fastify'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { createTenantMiddleware } from '../middleware/tenant.middleware'

interface DashboardRouteOptions {
  authProvider: IAuthProvider
  userRepository: IUserRepository
  membershipRepository: IMembershipRepository
  organizationRepository: IOrganizationRepository
  taskRepository: ITaskRepository
  leadRepository: ILeadRepository
}

export const dashboardRoute: FastifyPluginAsync<DashboardRouteOptions> = async (
  fastify,
  options,
) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(
    options.membershipRepository,
    options.userRepository,
    options.organizationRepository,
  )
  const getMyMonthlyStats = new GetMyMonthlyStatsUseCase(
    options.taskRepository,
    options.leadRepository,
  )

  // ── GET /dashboard/me/monthly ─────────────────────────────────────────────
  fastify.get(
    '/dashboard/me/monthly',
    { preHandler: [authMiddleware, tenantMiddleware] },
    async (request) => {
      const context = request.authContext as NonNullable<typeof request.authContext>
      const stats = await getMyMonthlyStats.execute({
        organizationId: context.currentMembership.organizationId,
        userId: context.userId,
      })
      return {
        ...stats,
        periodStart: stats.periodStart.toISOString(),
        periodEnd: stats.periodEnd.toISOString(),
      }
    },
  )
}
