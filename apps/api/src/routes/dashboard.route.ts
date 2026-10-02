// Rotas do painel do início.
//
// GET /dashboard/me/monthly — números do mês do próprio usuário na organização
//                             ativa: agendamentos (Reuniões com prazo no mês),
//                             visitas realizadas (dessas, as concluídas), valor
//                             ganho e tíquete médio. Qualquer papel — só olha
//                             os dados de quem está logado.
// GET /dashboard/me/streak  — ofensiva do Perfil: dias seguidos com atividade
//                             de trabalho, recorde e a semana atual (ver
//                             GetMyStreakUseCase). Do usuário, em todas as
//                             organizações.
// GET /dashboard/ranking    — ranking do mês dos Vendedores da organização
//                             ativa (valor e clientes ganhos, meta, ofensiva) +
//                             meta da operação. Qualquer papel — é o painel
//                             aberto a partir do início (GetSalesRankingUseCase).
//
// Roda authMiddleware → tenantMiddleware.

import type {
  IAuthProvider,
  ILeadRepository,
  IMembershipRepository,
  IOrganizationRepository,
  IStreakRepository,
  ITaskRepository,
  IUserRepository,
} from '@sylocrm/application'
import {
  GetMyMonthlyStatsUseCase,
  GetMyStreakUseCase,
  GetSalesRankingUseCase,
} from '@sylocrm/application'
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
  streakRepository: IStreakRepository
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
  const getMyStreak = new GetMyStreakUseCase(options.streakRepository)
  const getSalesRanking = new GetSalesRankingUseCase(
    options.membershipRepository,
    options.leadRepository,
    options.organizationRepository,
    options.streakRepository,
  )

  // ── GET /dashboard/ranking ────────────────────────────────────────────────
  fastify.get(
    '/dashboard/ranking',
    { preHandler: [authMiddleware, tenantMiddleware] },
    async (request) => {
      const context = request.authContext as NonNullable<typeof request.authContext>
      const ranking = await getSalesRanking.execute({
        organizationId: context.currentMembership.organizationId,
      })
      return {
        ...ranking,
        periodStart: ranking.periodStart.toISOString(),
        periodEnd: ranking.periodEnd.toISOString(),
      }
    },
  )

  // ── GET /dashboard/me/streak ──────────────────────────────────────────────
  fastify.get(
    '/dashboard/me/streak',
    { preHandler: [authMiddleware, tenantMiddleware] },
    async (request) => {
      const context = request.authContext as NonNullable<typeof request.authContext>
      return getMyStreak.execute({ userId: context.userId })
    },
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
