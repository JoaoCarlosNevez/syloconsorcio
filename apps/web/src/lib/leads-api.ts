// Tipos e chamadas HTTP do módulo de Leads.
// Espelha o contrato de apps/api/src/routes/leads.route.ts — mantenha em sincronia.

import { apiClient } from './api-client'

export type LeadStage = 'LEAD' | 'ATENDIMENTO' | 'SIMULACAO' | 'PROPOSTA' | 'FECHADO' | 'VENDA'

/** aberto: pipeline ativo (nem ganho, nem perdido) — padrão. ganho: stage VENDA.
 * perdido: lostAt setado — exige a permission lead.manage_lost (Vendedor não tem). */
export type OutcomeFilter = 'aberto' | 'ganho' | 'perdido'

export interface Lead {
  id: string
  organizationId: string
  name: string
  phone: string
  email: string | null
  segment: string
  valueCents: number
  quotaCount: number
  source: string
  stage: LeadStage
  assignedUserId: string | null
  stageChangedAt: string
  lostAt: string | null
  tags: string[]
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface LeadListPage {
  items: Lead[]
  total: number
  page: number
  pageSize: number
}

export interface ListLeadsParams {
  stage?: LeadStage
  search?: string
  page?: number
  pageSize?: number
  outcome?: OutcomeFilter
  /** Retorna leads que tenham QUALQUER uma destas tags (overlap, não AND). */
  tags?: string[]
}

export interface CreateLeadPayload {
  name: string
  phone: string
  email?: string | null
  segment: string
  valueCents: number
  quotaCount?: number
  source: string
  assignedUserId?: string | null
  notes?: string | null
}

export interface UpdateLeadPayload {
  name?: string
  phone?: string
  email?: string | null
  segment?: string
  valueCents?: number
  quotaCount?: number
  source?: string
  stage?: LeadStage
  assignedUserId?: string | null
  /** true marca como Perdido; false reabre um lead perdido. */
  lost?: boolean
  tags?: string[]
  notes?: string | null
}

function toQueryString(params: ListLeadsParams): string {
  const search = new URLSearchParams()
  if (params.stage) search.set('stage', params.stage)
  if (params.search) search.set('search', params.search)
  if (params.page) search.set('page', String(params.page))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))
  if (params.outcome) search.set('outcome', params.outcome)
  if (params.tags && params.tags.length > 0) search.set('tags', params.tags.join(','))
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function listLeads(
  organizationId: string,
  params: ListLeadsParams = {},
): Promise<LeadListPage> {
  return apiClient.get<LeadListPage>(`/leads${toQueryString(params)}`, { organizationId })
}

export function createLead(organizationId: string, payload: CreateLeadPayload): Promise<Lead> {
  return apiClient.post<Lead>('/leads', payload, { organizationId })
}

export function updateLead(
  organizationId: string,
  id: string,
  payload: UpdateLeadPayload,
): Promise<Lead> {
  return apiClient.patch<Lead>(`/leads/${id}`, payload, { organizationId })
}

export function deleteLead(organizationId: string, id: string): Promise<void> {
  return apiClient.delete<void>(`/leads/${id}`, { organizationId })
}
