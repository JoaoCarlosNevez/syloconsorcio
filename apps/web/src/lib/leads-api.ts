// Tipos e chamadas HTTP do módulo de Leads.
// Espelha o contrato de apps/api/src/routes/leads.route.ts — mantenha em sincronia.

import { apiClient } from './api-client'

/** aberto: pipeline ativo (nem ganho, nem perdido) — padrão. ganho: wonAt setado.
 * perdido: lostAt setado — exige a permission lead.manage_lost (Vendedor não tem).
 * todos: sem filtro (aberto+ganho+perdido juntos) — exige lead.manage_lost também,
 * já que inclui perdidos. Ganho/Perdido são independentes do estágio do funil. */
export type OutcomeFilter = 'aberto' | 'ganho' | 'perdido' | 'todos'

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
  funnelId: string
  stageId: string
  assignedUserId: string | null
  stageChangedAt: string
  lostAt: string | null
  wonAt: string | null
  tags: string[]
  notes: string | null
  /** Dados de qualificação do cliente — compartilhados por todas as propostas
   * desse lead (ver LeadProposal para entrada/prazo, que são por-proposta).
   * Null até o vendedor preencher a ficha. */
  profession: string | null
  incomeCents: number | null
  maritalStatus: string | null
  cpf: string | null
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
  funnelId?: string
  stageId?: string
  search?: string
  page?: number
  pageSize?: number
  outcome?: OutcomeFilter
  /** Retorna leads que tenham QUALQUER uma destas tags (overlap, não AND). */
  tags?: string[]
  /** Só leads deste responsável — exige lead.assign (acima de Vendedor). */
  assignedTo?: string
}

export interface CreateLeadPayload {
  name: string
  phone: string
  email?: string | null
  segment: string
  valueCents: number
  quotaCount?: number
  source: string
  funnelId: string
  assignedUserId?: string | null
  notes?: string | null
  profession?: string | null
  incomeCents?: number | null
  maritalStatus?: string | null
  cpf?: string | null
}

export interface UpdateLeadPayload {
  name?: string
  phone?: string
  email?: string | null
  segment?: string
  valueCents?: number
  quotaCount?: number
  source?: string
  stageId?: string
  assignedUserId?: string | null
  /** true marca como Perdido; false reabre um lead perdido. */
  lost?: boolean
  /** true marca como Ganho; false reabre um lead ganho. */
  won?: boolean
  tags?: string[]
  notes?: string | null
  profession?: string | null
  incomeCents?: number | null
  maritalStatus?: string | null
  cpf?: string | null
}

function toQueryString(params: ListLeadsParams): string {
  const search = new URLSearchParams()
  if (params.funnelId) search.set('funnelId', params.funnelId)
  if (params.stageId) search.set('stageId', params.stageId)
  if (params.search) search.set('search', params.search)
  if (params.page) search.set('page', String(params.page))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))
  if (params.outcome) search.set('outcome', params.outcome)
  if (params.tags && params.tags.length > 0) search.set('tags', params.tags.join(','))
  if (params.assignedTo) search.set('assignedTo', params.assignedTo)
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

/** Cria uma cópia do lead no primeiro estágio de outro funil ("passar o bastão"). */
export function duplicateLead(
  organizationId: string,
  id: string,
  targetFunnelId: string,
): Promise<Lead> {
  return apiClient.post<Lead>(`/leads/${id}/duplicate`, { targetFunnelId }, { organizationId })
}

export interface AssignmentHistoryEntry {
  id: string
  fromUserId: string | null
  toUserId: string | null
  changedByUserId: string
  changedAt: string
}

export interface LeadComment {
  id: string
  leadId: string
  userId: string
  text: string
  createdAt: string
}

export interface LeadHistory {
  assignmentHistory: AssignmentHistoryEntry[]
  comments: LeadComment[]
}

export function getLeadHistory(organizationId: string, leadId: string): Promise<LeadHistory> {
  return apiClient.get<LeadHistory>(`/leads/${leadId}/history`, { organizationId })
}

export function createLeadComment(
  organizationId: string,
  leadId: string,
  text: string,
): Promise<LeadComment> {
  return apiClient.post<LeadComment>(`/leads/${leadId}/comments`, { text }, { organizationId })
}

/** Proposta/simulação de crédito aprovada — entrada e prazo são por-proposta
 * (o mesmo lead pode ter várias, com valores diferentes). Sem valor de
 * parcela de propósito — calcular parcela de consórcio de verdade exige taxa
 * de administração, fundo de reserva e seguro, nenhum modelado ainda. */
export interface LeadProposal {
  id: string
  leadId: string
  downPaymentCents: number
  termMonths: number
  createdAt: string
}

export function listLeadProposals(
  organizationId: string,
  leadId: string,
): Promise<{ proposals: LeadProposal[] }> {
  return apiClient.get<{ proposals: LeadProposal[] }>(`/leads/${leadId}/proposals`, {
    organizationId,
  })
}

export function createLeadProposal(
  organizationId: string,
  leadId: string,
  payload: { downPaymentCents: number; termMonths: number },
): Promise<LeadProposal> {
  return apiClient.post<LeadProposal>(`/leads/${leadId}/proposals`, payload, { organizationId })
}
