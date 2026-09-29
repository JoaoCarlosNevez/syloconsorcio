// Chamadas HTTP das chaves de API — Configurações > Integrações.
// Espelha apps/api/src/routes/api-keys.route.ts.

import { apiClient } from './api-client'

export interface ApiKey {
  id: string
  organizationId: string
  name: string
  /** Começo da chave, pra identificação (ex: "sylo_a1B2c3D4"). */
  keyPrefix: string
  createdBy: { id: string; name: string | null; email: string } | null
  lastUsedAt: string | null
  createdAt: string
}

export interface CreatedApiKey extends ApiKey {
  /** A chave completa — a API só devolve na criação. */
  key: string
}

export async function listApiKeys(organizationId: string): Promise<ApiKey[]> {
  const { items } = await apiClient.get<{ items: ApiKey[] }>('/organization/api-keys', {
    organizationId,
  })
  return items
}

export function createApiKey(organizationId: string, name: string): Promise<CreatedApiKey> {
  return apiClient.post<CreatedApiKey>('/organization/api-keys', { name }, { organizationId })
}

export function revokeApiKey(organizationId: string, id: string): Promise<void> {
  return apiClient.delete<void>(`/organization/api-keys/${id}`, { organizationId })
}
