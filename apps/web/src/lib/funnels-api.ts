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

export type FunnelKind = 'COMMERCIAL' | 'SALES' | 'BACKOFFICE' | 'POST_SALE'

const KIND_ORDER: Record<FunnelKind, number> = {
  COMMERCIAL: 0,
  BACKOFFICE: 1,
  POST_SALE: 2,
  SALES: 3,
}

/** Ordem do fluxo: Comercial → ADM → Pós-venda → funis extras. */
export function sortFunnels<T extends { kind: FunnelKind }>(funnels: T[]): T[] {
  return [...funnels].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
}

export interface Funnel {
  id: string
  organizationId: string
  name: string
  isDefault: boolean
  /** Antigo gatilho "passar o bastão" — não é mais usado: o Ganho de um
   * funil de vendas sempre vai pro funil ADM. */
  duplicateToFunnelId: string | null
  /** Funis fixos do sistema: COMMERCIAL (o padrão; nome fixo, etapas
   * editáveis) → BACKOFFICE (ADM) → POST_SALE (Pós-venda), estes dois com
   * etapas fixas. SALES = funis de vendas extras, configuráveis. */
  kind: FunnelKind
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
