// Administradoras de consórcio da organização (Configurações →
// Administradoras). Espelha apps/api/src/routes/administrators.route.ts.

import { apiClient } from './api-client'

export interface Administrator {
  id: string
  name: string
  emails: string[]
  createdAt: string
  updatedAt: string
}

export interface AdministratorPayload {
  name: string
  emails: string[]
}

export function listAdministrators(organizationId: string): Promise<{ items: Administrator[] }> {
  return apiClient.get('/administrators', { organizationId })
}

export function createAdministrator(
  organizationId: string,
  payload: AdministratorPayload,
): Promise<Administrator> {
  return apiClient.post('/administrators', payload, { organizationId })
}

export function updateAdministrator(
  organizationId: string,
  id: string,
  payload: AdministratorPayload,
): Promise<Administrator> {
  return apiClient.patch(`/administrators/${id}`, payload, { organizationId })
}

export function deleteAdministrator(organizationId: string, id: string): Promise<void> {
  return apiClient.delete(`/administrators/${id}`, { organizationId })
}

/** "a@x.com, b@x.com" ou um por linha → lista. */
export function parseEmails(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((email) => email.trim())
    .filter(Boolean)
}

/** A cadastrada com esse nome (sem diferenciar maiúsculas e espaços). */
export function findAdministrator(
  administrators: readonly Administrator[],
  name: string,
): Administrator | null {
  const key = name.trim().toLowerCase()
  if (!key) return null
  return administrators.find((item) => item.name.trim().toLowerCase() === key) ?? null
}
