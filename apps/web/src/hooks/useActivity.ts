// useActivity — log de atividades da organização ativa, paginado com
// "Carregar mais" (TanStack Query infinite query).

import { useInfiniteQuery } from '@tanstack/react-query'
import { type ActivityEntityType, listActivity } from '../lib/activity-api'

const PAGE_SIZE = 30

export function useActivityQuery(organizationId: string | null, entityType?: ActivityEntityType) {
  return useInfiniteQuery({
    queryKey: ['activity', organizationId, entityType ?? 'all'],
    queryFn: ({ pageParam }) =>
      listActivity(organizationId as string, { entityType, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    enabled: Boolean(organizationId),
  })
}
