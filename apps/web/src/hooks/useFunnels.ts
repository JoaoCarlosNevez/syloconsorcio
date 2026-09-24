// useFunnels — server state do módulo de Funis via TanStack Query (ADR-04).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type CreateFunnelPayload,
  type Funnel,
  type UpdateFunnelPayload,
  createFunnel,
  deleteFunnel,
  listFunnels,
  updateFunnel,
} from '../lib/funnels-api'

function funnelsQueryKey(organizationId: string | null) {
  return ['funnels', organizationId] as const
}

export function useFunnelsQuery(organizationId: string | null) {
  return useQuery<{ funnels: Funnel[] }>({
    queryKey: funnelsQueryKey(organizationId),
    queryFn: () => listFunnels(organizationId as string),
    enabled: Boolean(organizationId),
  })
}

export function useCreateFunnel(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFunnelPayload) => createFunnel(organizationId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: funnelsQueryKey(organizationId) })
    },
  })
}

export function useUpdateFunnel(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFunnelPayload }) =>
      updateFunnel(organizationId as string, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: funnelsQueryKey(organizationId) })
    },
  })
}

export function useDeleteFunnel(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteFunnel(organizationId as string, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: funnelsQueryKey(organizationId) })
    },
  })
}
