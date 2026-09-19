// Chamadas HTTP da tela Configurações > Organização — dados da organização ativa.
// Espelha apps/api/src/routes/organization-settings.route.ts.
//
// Diferente de organizations-api.ts (painel de Administração do Super Admin,
// cross-tenant), estas chamadas são escopadas pela organização ativa
// (X-Organization-Id) e usadas por qualquer membro logado.

import { apiClient } from './api-client'
import type { Organization } from './organizations-api'

export interface UpdateOrganizationSettingsPayload {
  name?: string
  cnpj?: string | null
  phone?: string | null
  website?: string | null
  leadSegments?: string[]
}

export function getOrganizationSettings(
  organizationId: string,
): Promise<{ organization: Organization }> {
  return apiClient.get<{ organization: Organization }>('/organization', { organizationId })
}

export function updateOrganizationSettings(
  organizationId: string,
  payload: UpdateOrganizationSettingsPayload,
): Promise<{ organization: Organization }> {
  return apiClient.patch<{ organization: Organization }>('/organization', payload, {
    organizationId,
  })
}

export async function uploadOrganizationSettingsIcon(
  organizationId: string,
  file: File,
): Promise<{ organization: Organization }> {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.post<{ organization: Organization }>('/organization/icon', formData, {
    organizationId,
  })
}
