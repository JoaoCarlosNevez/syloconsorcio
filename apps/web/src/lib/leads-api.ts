// Tipos e chamadas HTTP do módulo de Leads.
// Espelha o contrato de apps/api/src/routes/leads.route.ts — mantenha em sincronia.

import { apiClient } from './api-client'

export type LeadStage = 'LEAD' | 'ATENDIMENTO' | 'SIMULACAO' | 'PROPOSTA' | 'FECHADO' | 'VENDA'

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
}

function toQueryString(params: ListLeadsParams): string {
  const search = new URLSearchParams()
  if (params.stage) search.set('stage', params.stage)
  if (params.search) search.set('search', params.search)
  if (params.page) search.set('page', String(params.page))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))
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
