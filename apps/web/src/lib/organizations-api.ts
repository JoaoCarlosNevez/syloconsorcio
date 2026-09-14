// Chamadas HTTP de organizações — hoje só a criação de Representações,
// restrita ao Super Admin da plataforma (ver apps/api/src/routes/organizations.route.ts).

import { apiClient } from './api-client'

export interface CreateRepresentationPayload {
  organizationName: string
  ownerName: string
  ownerEmail: string
}

export interface CreateRepresentationResult {
  organization: { id: string; name: string; type: string; parentOrganizationId: string | null }
  owner: { id: string; email: string; temporaryPassword: string }
}

export function createRepresentation(
  payload: CreateRepresentationPayload,
): Promise<CreateRepresentationResult> {
  // Rota de plataforma — não é escopada por organização, então não envia
  // X-Organization-Id (o usuário pode nem ter uma organização ativa ainda).
  return apiClient.post<CreateRepresentationResult>('/organizations', payload)
}
