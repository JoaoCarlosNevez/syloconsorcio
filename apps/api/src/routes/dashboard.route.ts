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
// GET /dashboard/ranking    — ranking (?period=week|month, padrão mês) dos Vendedores da organização
//                             ativa (valor e clientes ganhos, meta, ofensiva) +
//                             meta da operação. Qualquer papel — é o painel
//                             aberto a partir do início (GetSalesRankingUseCase).
// GET /dashboard/ranking/activities — "corrida" de ligações e visitas
//                             concluídas (?period=week|month, padrão semana)
//                             (GetActivityRankingUseCase). Qualquer papel.
// GET /dashboard/management — início do Dono e do Supervisor (reports.read):
//                             resumo do período (?period=week|month|last_month,
//                             padrão mês), saúde do pipeline, funil de vendas
//                             (?funnelId, padrão o funil padrão), funil ADM e
//                             desempenho por vendedor/supervisor. Recorte pelo
//                             papel (Supervisor com time vê o time) e pelos
//                             filtros ?sellerUserId e ?supervisorUserId (só o
//                             Dono) (GetManagementDashboardUseCase).
//
// Roda authMiddleware → tenantMiddleware (→ requirePermission onde indicado).

import type {
  IAuthProvider,
  IFunnelRepository,
  ILeadRepository,
  IManagementDashboardRepository,
  IMembershipRepository,
  IOrganizationRepository,
  IStreakRepository,
  ITaskRepository,
  IUserRepository,
} from '@sylocrm/application'
import {
  GetActivityRankingUseCase,
  GetManagementDashboardUseCase,
  GetMyMonthlyStatsUseCase,
  GetMyStreakUseCase,
  GetSalesRankingUseCase,
} from '@sylocrm/application'
import { AuthorizationError, Permission } from '@sylocrm/domain'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'
import { createTenantMiddleware } from '../middleware/tenant.middleware'

interface DashboardRouteOptions {
  authProvider: IAuthProvider
  userRepository: IUserRepository
  membershipRepository: IMembershipRepository
  organizationRepository: IOrganizationRepository
  taskRepository: ITaskRepository
  leadRepository: ILeadRepository
  streakRepository: IStreakRepository
  funnelRepository: IFunnelRepository
  managementDashboardRepository: IManagementDashboardRepository
}

const rankingQuerySchema = z.object({ period: z.enum(['week', 'month']).optional() })
const managementQuerySchema = z.object({
  period: z.enum(['week', 'month', 'last_month']).optional(),
  funnelId: z.string().uuid().optional(),
  sellerUserId: z.string().uuid().optional(),
  supervisorUserId: z.string().uuid().optional(),
})

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

  const getActivityRanking = new GetActivityRankingUseCase(
    options.membershipRepository,
    options.taskRepository,
    options.streakRepository,
  )

  const getManagementDashboard = new GetManagementDashboardUseCase(
    options.managementDashboardRepository,
    options.funnelRepository,
    options.organizationRepository,
    options.membershipRepository,
  )

  // ── GET /dashboard/management ─────────────────────────────────────────────
  fastify.get(
    '/dashboard/management',
    {
      preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.REPORTS_READ)],
    },
    async (request, reply) => {
      const query = managementQuerySchema.safeParse(request.query)
      if (!query.success) {
        return reply
          .status(400)
          .send({ error: 'Filtro inválido.', code: 'VALIDATION_ERROR', status: 400 })
      }
      const context = request.authContext as NonNullable<typeof request.authContext>
      try {
        const dashboard = await getManagementDashboard.execute({
          organizationId: context.currentMembership.organizationId,
          period: query.data.period,
          funnelId: query.data.funnelId,
          sellerUserId: query.data.sellerUserId,
          supervisorUserId: query.data.supervisorUserId,
          viewer: {
            userId: context.userId,
            role: context.currentMembership.role,
            teamUserIds: context.currentMembership.teamUserIds,
          },
        })
        return {
          ...dashboard,
          periodStart: dashboard.periodStart.toISOString(),
          periodEnd: dashboard.periodEnd.toISOString(),
        }
      } catch (error) {
        if (error instanceof AuthorizationError) {
          return reply.status(403).send({ error: error.message, code: error.code, status: 403 })
        }
        throw error
      }
    },
  )

  // ── GET /dashboard/ranking/activities ─────────────────────────────────────
  fastify.get(
    '/dashboard/ranking/activities',
    { preHandler: [authMiddleware, tenantMiddleware] },
    async (request, reply) => {
      const query = rankingQuerySchema.safeParse(request.query)
      if (!query.success) {
        return reply
          .status(400)
          .send({ error: 'Período inválido.', code: 'VALIDATION_ERROR', status: 400 })
      }
      const context = request.authContext as NonNullable<typeof request.authContext>
      const ranking = await getActivityRanking.execute({
        organizationId: context.currentMembership.organizationId,
        period: query.data.period,
      })
      return {
        ...ranking,
        periodStart: ranking.periodStart.toISOString(),
        periodEnd: ranking.periodEnd.toISOString(),
      }
    },
  )

  // ── GET /dashboard/ranking ────────────────────────────────────────────────
  fastify.get(
    '/dashboard/ranking',
    { preHandler: [authMiddleware, tenantMiddleware] },
    async (request, reply) => {
      const query = rankingQuerySchema.safeParse(request.query)
      if (!query.success) {
        return reply
          .status(400)
          .send({ error: 'Período inválido.', code: 'VALIDATION_ERROR', status: 400 })
      }
      const context = request.authContext as NonNullable<typeof request.authContext>
      const ranking = await getSalesRanking.execute({
        organizationId: context.currentMembership.organizationId,
        period: query.data.period,
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
