// useLeads — server state do módulo de Leads via TanStack Query (ADR-04).
// Nunca guardar leads em useState — o board do Kanban sincroniza a partir daqui.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type CreateLeadPayload,
  type LeadHistory,
  type LeadListPage,
  type ListLeadsParams,
  type UpdateLeadPayload,
  createLead,
  createLeadComment,
  deleteLead,
  getLeadHistory,
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

function leadHistoryQueryKey(organizationId: string | null, leadId: string) {
  return ['leads', organizationId, leadId, 'history'] as const
}

export function useLeadHistoryQuery(organizationId: string | null, leadId: string) {
  return useQuery<LeadHistory>({
    queryKey: leadHistoryQueryKey(organizationId, leadId),
    queryFn: () => getLeadHistory(organizationId as string, leadId),
    enabled: Boolean(organizationId) && Boolean(leadId),
  })
}

export function useCreateLeadComment(organizationId: string | null, leadId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => createLeadComment(organizationId as string, leadId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadHistoryQueryKey(organizationId, leadId) })
    },
  })
}
