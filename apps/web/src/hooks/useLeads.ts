// useLeads — server state do módulo de Leads via TanStack Query (ADR-04).
// Nunca guardar leads em useState — o board do Kanban sincroniza a partir daqui.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type CreateLeadPayload,
  type LeadListPage,
  type ListLeadsParams,
  type UpdateLeadPayload,
  createLead,
  deleteLead,
  listLeads,
  updateLead,
} from '../lib/leads-api'

function leadsQueryKey(organizationId: string | null, params: ListLeadsParams) {
  return ['leads', organizationId, params] as const
}

export function useLeadsQuery(organizationId: string | null, params: ListLeadsParams = {}) {
  return useQuery<LeadListPage>({
    queryKey: leadsQueryKey(organizationId, params),
    queryFn: () => listLeads(organizationId as string, params),
    enabled: Boolean(organizationId),
  })
}

export function useCreateLead(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateLeadPayload) => createLead(organizationId as string, payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', organizationId] })
    },
  })
}

export function useUpdateLead(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateLeadPayload }) =>
      updateLead(organizationId as string, id, payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', organizationId] })
    },
  })
}

export function useDeleteLead(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLead(organizationId as string, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', organizationId] })
    },
  })
}
