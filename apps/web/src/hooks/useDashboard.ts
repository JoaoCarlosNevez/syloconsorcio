// useDashboard — server state dos cards do início (ADR-04).

import { useQuery } from '@tanstack/react-query'
import { getMyMonthlyStats } from '../lib/dashboard-api'

export function useMyMonthlyStatsQuery(organizationId: string | null) {
  return useQuery({
    queryKey: ['dashboard', 'me', 'monthly', organizationId],
    queryFn: () => getMyMonthlyStats(organizationId as string),
    enabled: Boolean(organizationId),
  })
}
