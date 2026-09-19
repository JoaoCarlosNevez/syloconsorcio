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
  /** Só organizações White Label podem definir um ícone próprio (branding.iconUrl). */
  isWhiteLabel: boolean
  branding: OrganizationBranding | null
  cnpj: string | null
  phone: string | null
  website: string | null
  /** Tipos de crédito/segmento configurados — usado pra popular o Segmento na criação de lead. */
  leadSegments: string[]
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

/** Membro de qualquer organização da plataforma — visão cross-org do Super Admin. */
export interface PlatformMember extends TeamMember {
  organizationId: string
  organizationName: string
}

export interface CreatePlatformUserPayload {
  organizationId: string
  name: string
  email: string
  role: 'ADMIN' | 'MANAGER' | 'SELLER'
}

export interface CreatePlatformUserResult {
  member: {
    id: string
    email: string
    role: 'ADMIN' | 'MANAGER' | 'SELLER'
    temporaryPassword: string
  }
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
  payload: { name?: string; isWhiteLabel?: boolean },
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

export function listPlatformMembers(): Promise<{ members: PlatformMember[] }> {
  return apiClient.get<{ members: PlatformMember[] }>('/organizations/members')
}

export function createPlatformUser(
  payload: CreatePlatformUserPayload,
): Promise<CreatePlatformUserResult> {
  return apiClient.post<CreatePlatformUserResult>('/organizations/members', payload)
}

/**
 * Apaga a conta da pessoa da plataforma inteira: login (Supabase Auth) e
 * todos os vínculos com organizações. Irreversível. O registro em `users`
 * (nome/e-mail) não é apagado — ver DeletePlatformUserUseCase pro porquê.
 */
export function deletePlatformUser(userId: string): Promise<void> {
  return apiClient.delete<void>(`/organizations/members/${userId}`)
}
