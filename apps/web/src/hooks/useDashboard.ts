// useDashboard — server state dos cards do início (ADR-04).

import { useQuery } from '@tanstack/react-query'
import {
  type ManagementFilters,
  type ManagementPeriod,
  type SalesRankingPeriod,
  getActivityRanking,
  getManagementDashboard,
  getMyAchievements,
  getMyEngagement,
  getMyMonthlyStats,
  getMyStreak,
  getSalesRanking,
} from '../lib/dashboard-api'

/** O ranking fica aberto numa TV: atualiza sozinho a cada minuto. */
const RANKING_REFETCH_MS = 60_000

/** Ofensiva do usuário (é dele em todas as organizações; organizationId só
 * porque as rotas do painel passam pelo tenantMiddleware). */
export function useMyStreakQuery(organizationId: string | null) {
  return useQuery({
    queryKey: ['dashboard', 'me', 'streak'],
    queryFn: () => getMyStreak(organizationId as string),
    enabled: Boolean(organizationId),
  })
}

export function useSalesRankingQuery(organizationId: string | null, period: SalesRankingPeriod) {
  return useQuery({
    queryKey: ['dashboard', 'ranking', organizationId, period],
    queryFn: () => getSalesRanking(organizationId as string, period),
    enabled: Boolean(organizationId),
    refetchInterval: RANKING_REFETCH_MS,
    refetchIntervalInBackground: true,
  })
}

export function useActivityRankingQuery(
  organizationId: string | null,
  period: SalesRankingPeriod,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['dashboard', 'ranking', 'activities', organizationId, period],
    queryFn: () => getActivityRanking(organizationId as string, period),
    enabled: Boolean(organizationId) && enabled,
    refetchInterval: RANKING_REFETCH_MS,
    refetchIntervalInBackground: true,
  })
}

export function useMyMonthlyStatsQuery(organizationId: string | null) {
  return useQuery({
    queryKey: ['dashboard', 'me', 'monthly', organizationId],
    queryFn: () => getMyMonthlyStats(organizationId as string),
    enabled: Boolean(organizationId),
  })
}

/** Início do Dono e do Supervisor — atualiza sozinho a cada 2 minutos. */
export function useManagementDashboardQuery(
  organizationId: string | null,
  period: ManagementPeriod,
  funnelId: string | null,
  filters: ManagementFilters,
) {
  return useQuery({
    queryKey: ['dashboard', 'management', organizationId, period, funnelId, filters],
    queryFn: () => getManagementDashboard(organizationId as string, period, funnelId, filters),
    enabled: Boolean(organizationId),
    refetchInterval: 2 * 60_000,
    placeholderData: (previous) => previous,
  })
}

/** "Engajamento operacional" do Perfil — últimos 30 dias do usuário. */
export function useMyEngagementQuery(organizationId: string | null) {
  return useQuery({
    queryKey: ['dashboard', 'me', 'engagement', organizationId],
    queryFn: () => getMyEngagement(organizationId as string),
    enabled: Boolean(organizationId),
  })
}

/** Mural de Conquistas do Perfil. */
export function useMyAchievementsQuery(organizationId: string | null) {
  return useQuery({
    queryKey: ['dashboard', 'me', 'achievements', organizationId],
    queryFn: () => getMyAchievements(organizationId as string),
    enabled: Boolean(organizationId),
  })
}
