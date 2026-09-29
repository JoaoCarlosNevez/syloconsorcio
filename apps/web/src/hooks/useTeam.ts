// useTeam — server state da equipe da organização ativa (ADR-04).

import type { Tier } from '@sylocrm/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type InviteTeamMemberPayload,
  getSalesGoalsSummary,
  inviteTeamMember,
  listTeamMembers,
  reactivateTeamMember,
  removeTeamMember,
  updateMyPersonalGoal,
  updateTeamMemberSalesGoal,
  updateTeamMemberTier,
} from '../lib/team-api'

export function useTeamMembersQuery(organizationId: string | null) {
  return useQuery({
    queryKey: ['team', 'members', organizationId],
    queryFn: () => listTeamMembers(organizationId as string),
    enabled: Boolean(organizationId),
  })
}

export function useSalesGoalsSummaryQuery(organizationId: string | null) {
  return useQuery({
    queryKey: ['team', 'goals', 'summary', organizationId],
    queryFn: () => getSalesGoalsSummary(organizationId as string),
    enabled: Boolean(organizationId),
  })
}

export function useInviteTeamMember(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: InviteTeamMemberPayload) =>
      inviteTeamMember(organizationId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'members', organizationId] })
    },
  })
}

export function useRemoveTeamMember(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => removeTeamMember(organizationId as string, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'members', organizationId] })
    },
  })
}

export function useReactivateTeamMember(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => reactivateTeamMember(organizationId as string, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'members', organizationId] })
    },
  })
}

export function useUpdateTeamMemberSalesGoal(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, salesGoalCents }: { userId: string; salesGoalCents: number | null }) =>
      updateTeamMemberSalesGoal(organizationId as string, userId, salesGoalCents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'members', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['team', 'goals', 'summary', organizationId] })
    },
  })
}

export function useUpdateTeamMemberTier(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, tier }: { userId: string; tier: Tier }) =>
      updateTeamMemberTier(organizationId as string, userId, tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'members', organizationId] })
      // A patente do próprio usuário vem de /auth/memberships (sidebar, início,
      // perfil) — o Super Admin pode estar alterando a própria.
      queryClient.invalidateQueries({ queryKey: ['auth', 'memberships'] })
    },
  })
}

export function useUpdateMyPersonalGoal(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (personalGoalCents: number | null) =>
      updateMyPersonalGoal(organizationId as string, personalGoalCents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'goals', 'summary', organizationId] })
    },
  })
}
