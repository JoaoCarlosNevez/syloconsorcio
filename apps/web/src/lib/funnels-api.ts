// Tipos e chamadas HTTP do módulo de Funis.
// Espelha o contrato de apps/api/src/routes/funnels.route.ts — mantenha em sincronia.

import { apiClient } from './api-client'

export interface FunnelStage {
  id: string
  funnelId: string
  name: string
  color: string
  position: number
  /** Quantidade de leads atualmente neste estágio — só vem populado no GET /funnels. */
  leadCount?: number
}

export interface Funnel {
  id: string
  organizationId: string
  name: string
  isDefault: boolean
  /** Gatilho "passar o bastão" — ao marcar Ganho neste funil, duplica
   * automaticamente o lead pro primeiro estágio deste outro funil. Null = desativado. */
  duplicateToFunnelId: string | null
  /** Sempre ordenados por position asc. */
  stages: FunnelStage[]
  createdAt: string
  updatedAt: string
}

export interface StageInput {
  /** Presente = atualiza estágio existente; ausente = cria um estágio novo. */
  id?: string
  name: string
  color?: string
}

export interface CreateFunnelPayload {
  name: string
  stages: { name: string; color?: string }[]
}

export interface UpdateFunnelPayload {
  name?: string
  isDefault?: boolean
  /** Lista completa e ordenada dos estágios finais do funil. */
  stages?: StageInput[]
  /** null desativa o gatilho "passar o bastão". */
  duplicateToFunnelId?: string | null
}

export function listFunnels(organizationId: string): Promise<{ funnels: Funnel[] }> {
  return apiClient.get<{ funnels: Funnel[] }>('/funnels', { organizationId })
}

export function createFunnel(
  organizationId: string,
  payload: CreateFunnelPayload,
): Promise<Funnel> {
  return apiClient.post<Funnel>('/funnels', payload, { organizationId })
}

export function updateFunnel(
  organizationId: string,
  id: string,
  payload: UpdateFunnelPayload,
): Promise<Funnel> {
  return apiClient.patch<Funnel>(`/funnels/${id}`, payload, { organizationId })
}

export function deleteFunnel(organizationId: string, id: string): Promise<void> {
  return apiClient.delete<void>(`/funnels/${id}`, { organizationId })
}
