// Chamadas HTTP do log de atividades — Configurações > Atividade.
// Espelha apps/api/src/routes/activity.route.ts.

import { apiClient } from './api-client'

export type ActivityEntityType = 'lead' | 'task' | 'funnel' | 'team' | 'organization'

export type ActivityMetadata = Record<string, string | number | boolean | string[] | null>

export interface ActivityEntry {
  id: string
  organizationId: string
  actor: { id: string; name: string | null; email: string; avatarUrl: string | null } | null
  /** Ex: "lead.created", "task.completed" — ver ActivityAction no backend. */
  action: string
  entityType: ActivityEntityType
  entityId: string | null
  entityLabel: string | null
  metadata: ActivityMetadata
  createdAt: string
}

export interface ActivityPage {
  items: ActivityEntry[]
  total: number
  page: number
  pageSize: number
}

export function listActivity(
  organizationId: string,
  params: { entityType?: ActivityEntityType; page?: number; pageSize?: number },
): Promise<ActivityPage> {
  const search = new URLSearchParams()
  if (params.entityType) search.set('entityType', params.entityType)
  if (params.page) search.set('page', String(params.page))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))
  const qs = search.toString()
  return apiClient.get<ActivityPage>(`/activity${qs ? `?${qs}` : ''}`, { organizationId })
}
