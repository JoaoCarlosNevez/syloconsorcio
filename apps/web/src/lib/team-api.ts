// Chamadas HTTP de equipe — listar e convidar membros da organização ativa.
// Espelha apps/api/src/routes/team.route.ts.

import { apiClient } from './api-client'

export type InvitableRole = 'MANAGER' | 'SELLER'

export interface TeamMember {
  userId: string
  name: string | null
  email: string
  avatarUrl: string | null
  role: 'ADMIN' | 'MANAGER' | 'SELLER'
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'
}

export interface InviteTeamMemberPayload {
  name: string
  email: string
  role: InvitableRole
}

export interface InviteTeamMemberResult {
  member: { id: string; email: string; role: InvitableRole; temporaryPassword: string }
}

export function listTeamMembers(organizationId: string): Promise<{ members: TeamMember[] }> {
  return apiClient.get<{ members: TeamMember[] }>('/team/members', { organizationId })
}

export function inviteTeamMember(
  organizationId: string,
  payload: InviteTeamMemberPayload,
): Promise<InviteTeamMemberResult> {
  return apiClient.post<InviteTeamMemberResult>('/team/members', payload, { organizationId })
}

export function removeTeamMember(organizationId: string, userId: string): Promise<void> {
  return apiClient.delete<void>(`/team/members/${userId}`, { organizationId })
}

export function reactivateTeamMember(organizationId: string, userId: string): Promise<void> {
  return apiClient.post<void>(`/team/members/${userId}/reactivate`, undefined, { organizationId })
}
