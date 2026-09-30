// useLeads — server state do módulo de Leads via TanStack Query (ADR-04).
// Nunca guardar leads em useState — o board do Kanban sincroniza a partir daqui.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type CreateLeadPayload,
  type CreateLeadProposalPayload,
  type LeadHistory,
  type LeadListPage,
  type LeadProposal,
  type ListLeadsParams,
  type UpdateLeadPayload,
  createLead,
  createLeadComment,
  createLeadProposal,
  deleteLead,
  duplicateLead,
  getLeadHistory,
  listLeadProposals,
  listLeads,
  shareLeadProposal,
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
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'me', 'monthly', organizationId] })
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
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'me', 'monthly', organizationId] })
    },
  })
}

export function useDeleteLead(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLead(organizationId as string, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'me', 'monthly', organizationId] })
    },
  })
}

export function useDuplicateLead(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, targetFunnelId }: { id: string; targetFunnelId: string }) =>
      duplicateLead(organizationId as string, id, targetFunnelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'me', 'monthly', organizationId] })
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

function leadProposalsQueryKey(organizationId: string | null, leadId: string) {
  return ['leads', organizationId, leadId, 'proposals'] as const
}

export function useLeadProposalsQuery(organizationId: string | null, leadId: string) {
  return useQuery<{ proposals: LeadProposal[] }>({
    queryKey: leadProposalsQueryKey(organizationId, leadId),
    queryFn: () => listLeadProposals(organizationId as string, leadId),
    enabled: Boolean(organizationId) && Boolean(leadId),
  })
}

export function useShareLeadProposal(organizationId: string | null, leadId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (proposalId: string) =>
      shareLeadProposal(organizationId as string, leadId, proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadProposalsQueryKey(organizationId, leadId) })
    },
  })
}

export function useCreateLeadProposal(organizationId: string | null, leadId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateLeadProposalPayload) =>
      createLeadProposal(organizationId as string, leadId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadProposalsQueryKey(organizationId, leadId) })
    },
  })
}
