// ILeadRepository — port para persistência de leads.
//
// Definido na camada Application (o consumidor define o contrato).
// Implementação concreta: packages/infrastructure/src/database/repositories/
//
// Toda query de listagem é paginada e filtrada server-side (regra P0 — ver AGENTS.md).
// `organizationIds` nunca vem do cliente: é resolvido pelo use case a partir do
// DataScope da Membership ativa (ver packages/application/src/leads/lead-scope.ts).

import type { LeadStage } from '@sylocrm/domain'

export interface LeadRecord {
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
  stageChangedAt: Date
  /** Null enquanto o lead está ativo no funil; setado ao marcar como Perdido. */
  lostAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface NewLeadInput {
  organizationId: string
  name: string
  phone: string
  email?: string | null
  segment: string
  valueCents: number
  quotaCount?: number
  source: string
  assignedUserId?: string | null
}

export interface UpdateLeadInput {
  name?: string
  phone?: string
  email?: string | null
  segment?: string
  valueCents?: number
  quotaCount?: number
  source?: string
  stage?: LeadStage
  assignedUserId?: string | null
  /** true marca como Perdido (lostAt = agora); false reabre (lostAt = null). */
  lost?: boolean
}

export interface LeadScopeFilter {
  /** Organizações visíveis nesta requisição — resolvidas a partir do DataScope. */
  organizationIds: string[]
  /** Presente apenas quando DataScope.OWN — restringe aos leads do próprio usuário. */
  assignedUserId?: string
}

export interface LeadListFilter extends LeadScopeFilter {
  stage?: LeadStage
  /** Busca livre por nome ou telefone. */
  search?: string
}

export interface LeadListPage {
  items: LeadRecord[]
  total: number
  page: number
  pageSize: number
}

export interface AssignmentChange {
  leadId: string
  fromUserId: string | null
  toUserId: string | null
  changedByUserId: string
}

export interface ILeadRepository {
  list(filter: LeadListFilter, page: number, pageSize: number): Promise<LeadListPage>

  /** Retorna null se não existir ou se estiver fora do escopo. */
  findById(id: string, scope: LeadScopeFilter): Promise<LeadRecord | null>

  create(input: NewLeadInput): Promise<LeadRecord>

  /** Retorna null se o lead não existir ou estiver fora do escopo. */
  update(id: string, scope: LeadScopeFilter, input: UpdateLeadInput): Promise<LeadRecord | null>

  /** Retorna false se o lead não existir ou estiver fora do escopo. */
  delete(id: string, scope: LeadScopeFilter): Promise<boolean>

  /** Registra uma mudança de responsável para auditoria (AGENTS.md §10). */
  recordAssignmentChange(change: AssignmentChange): Promise<void>
}
