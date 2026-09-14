// Chamadas HTTP de organizações — painel de Administração do Super Admin.
// Espelha apps/api/src/routes/organizations.route.ts.

import { apiClient } from './api-client'
import type { TeamMember } from './team-api'

export interface OrganizationBranding {
  iconUrl?: string
}

export interface Organization {
  id: string
  name: string
  type: 'INCORPORADORA' | 'MASTER' | 'REPRESENTACAO'
  parentOrganizationId: string | null
  branding: OrganizationBranding | null
}

export interface CreateRepresentationPayload {
  organizationName: string
  ownerName: string
  ownerEmail: string
}

export interface CreateRepresentationResult {
  organization: Organization
  owner: { id: string; email: string; temporaryPassword: string }
}

// Rotas de plataforma — não são escopadas por organização, então nunca
// enviam X-Organization-Id (o Super Admin não precisa ser membro do alvo).

export function createRepresentation(
  payload: CreateRepresentationPayload,
): Promise<CreateRepresentationResult> {
  return apiClient.post<CreateRepresentationResult>('/organizations', payload)
}

export function listOrganizations(): Promise<{ organizations: Organization[] }> {
  return apiClient.get<{ organizations: Organization[] }>('/organizations')
}

export function updateOrganization(
  id: string,
  payload: { name: string },
): Promise<{ organization: Organization }> {
  return apiClient.patch<{ organization: Organization }>(`/organizations/${id}`, payload)
}

export async function uploadOrganizationIcon(
  id: string,
  file: File,
): Promise<{ organization: Organization }> {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.post<{ organization: Organization }>(`/organizations/${id}/icon`, formData)
}

export function getOrganizationMembers(id: string): Promise<{ members: TeamMember[] }> {
  return apiClient.get<{ members: TeamMember[] }>(`/organizations/${id}/members`)
}
