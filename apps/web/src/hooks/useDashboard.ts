// useDashboard — server state dos cards do início (ADR-04).

import { useQuery } from '@tanstack/react-query'
import { getMyMonthlyStats, getMyStreak } from '../lib/dashboard-api'

/** Ofensiva do usuário (é dele em todas as organizações; organizationId só
 * porque as rotas do painel passam pelo tenantMiddleware). */
export function useMyStreakQuery(organizationId: string | null) {
  return useQuery({
    queryKey: ['dashboard', 'me', 'streak'],
    queryFn: () => getMyStreak(organizationId as string),
    enabled: Boolean(organizationId),
  })
}

export function useMyMonthlyStatsQuery(organizationId: string | null) {
  return useQuery({
    queryKey: ['dashboard', 'me', 'monthly', organizationId],
    queryFn: () => getMyMonthlyStats(organizationId as string),
    enabled: Boolean(organizationId),
  })
}
