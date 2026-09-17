// useTeam — server state da equipe da organização ativa (ADR-04).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type InviteTeamMemberPayload,
  inviteTeamMember,
  listTeamMembers,
  reactivateTeamMember,
  removeTeamMember,
} from '../lib/team-api'

export function useTeamMembersQuery(organizationId: string | null) {
  return useQuery({
    queryKey: ['team', 'members', organizationId],
    queryFn: () => listTeamMembers(organizationId as string),
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
