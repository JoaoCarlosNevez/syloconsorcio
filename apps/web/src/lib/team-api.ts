// Chamadas HTTP de equipe — listar e convidar membros da organização ativa.
// Espelha apps/api/src/routes/team.route.ts.

import type { Tier } from '@sylocrm/ui'
import { apiClient } from './api-client'

export type InvitableRole = 'MANAGER' | 'SELLER'

export interface TeamMember {
  userId: string
  name: string | null
  email: string
  avatarUrl: string | null
  role: 'ADMIN' | 'MANAGER' | 'SELLER'
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'
  /** Meta de vendas na organização, em centavos de crédito. null = sem meta. */
  salesGoalCents: number | null
  /** Patente do membro na organização. */
  tier: Tier
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

export function updateTeamMemberSalesGoal(
  organizationId: string,
  userId: string,
  salesGoalCents: number | null,
): Promise<void> {
  return apiClient.patch<void>(`/team/members/${userId}`, { salesGoalCents }, { organizationId })
}

export function updateTeamMemberTier(
  organizationId: string,
  userId: string,
  tier: Tier,
): Promise<void> {
  return apiClient.put<void>(`/team/members/${userId}/tier`, { tier }, { organizationId })
}

export interface SalesGoalProgress {
  /** Centavos de crédito; null quando não há meta definida. */
  goalCents: number | null
  achievedCents: number
}

/** goalCents é a meta pessoal (Perfil); teamGoalCents, a definida pelo
 * gestor em Configurações → Equipe. */
export interface PersonalGoalProgress extends SalesGoalProgress {
  teamGoalCents: number | null
}

export interface SalesGoalsSummary {
  periodStart: string
  periodEnd: string
  personal: PersonalGoalProgress
  organization: SalesGoalProgress
}

export function getSalesGoalsSummary(organizationId: string): Promise<SalesGoalsSummary> {
  return apiClient.get<SalesGoalsSummary>('/team/goals/summary', { organizationId })
}

export function updateMyPersonalGoal(
  organizationId: string,
  personalGoalCents: number | null,
): Promise<void> {
  return apiClient.put<void>('/team/me/personal-goal', { personalGoalCents }, { organizationId })
}
