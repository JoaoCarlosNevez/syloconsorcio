// ILeadRepository — port para persistência de leads.
//
// Definido na camada Application (o consumidor define o contrato).
// Implementação concreta: packages/infrastructure/src/database/repositories/
//
// Toda query de listagem é paginada e filtrada server-side (regra P0 — ver AGENTS.md).
// `organizationIds` nunca vem do cliente: é resolvido pelo use case a partir do
// DataScope da Membership ativa (ver packages/application/src/leads/lead-scope.ts).

/**
 * aberto: pipeline ativo (wonAt e lostAt null) — padrão. ganho: wonAt setado.
 * perdido: lostAt setado (exige Permission.LEAD_MANAGE_LOST, checado na camada
 * HTTP — ver apps/api/src/routes/leads.route.ts). Ganho/Perdido são
 * independentes do estágio do funil — ver plano "Múltiplos funis customizáveis".
 */
export type LeadOutcomeFilter = 'aberto' | 'ganho' | 'perdido' | 'todos'

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
  funnelId: string
  stageId: string
  assignedUserId: string | null
  stageChangedAt: Date
  /** Null enquanto o lead está ativo no funil; setado ao marcar como Perdido. */
  lostAt: Date | null
  /** Null enquanto o lead não foi ganho; setado ao marcar como Ganho. */
  wonAt: Date | null
  /** Tags livres (ex: "Quente", "Frio") — um lead pode ter várias ao mesmo tempo. */
  tags: string[]
  notes: string | null
  /** Dados de qualificação do cliente — compartilhados por todas as propostas
   * desse lead (ver lead-proposal.repository.ts para entrada/prazo, que são
   * por-proposta). Null até o vendedor preencher a ficha. */
  profession: string | null
  incomeCents: number | null
  maritalStatus: string | null
  cpf: string | null
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
  funnelId: string
  stageId: string
  assignedUserId?: string | null
  tags?: string[]
  notes?: string | null
  profession?: string | null
  incomeCents?: number | null
  maritalStatus?: string | null
  cpf?: string | null
}

export interface UpdateLeadInput {
  name?: string
  phone?: string
  email?: string | null
  segment?: string
  valueCents?: number
  quotaCount?: number
  source?: string
  stageId?: string
  assignedUserId?: string | null
  /** true marca como Perdido (lostAt = agora); false reabre (lostAt = null). */
  lost?: boolean
  /** true marca como Ganho (wonAt = agora); false reabre (wonAt = null). */
  won?: boolean
  tags?: string[]
  notes?: string | null
  profession?: string | null
  incomeCents?: number | null
  maritalStatus?: string | null
  cpf?: string | null
}

export interface LeadScopeFilter {
  /** Organizações visíveis nesta requisição — resolvidas a partir do DataScope. */
  organizationIds: string[]
  /** Presente apenas quando DataScope.OWN — restringe aos leads do próprio usuário. */
  assignedUserId?: string
}

export interface LeadListFilter extends LeadScopeFilter {
  funnelId?: string
  stageId?: string
  /** Busca livre por nome ou telefone. */
  search?: string
  /** Padrão 'aberto' quando ausente — ver LeadOutcomeFilter. */
  outcome?: LeadOutcomeFilter
  /** Retorna leads que tenham QUALQUER uma destas tags (overlap, não AND). */
  tags?: string[]
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

export interface AssignmentHistoryRecord {
  id: string
  leadId: string
  fromUserId: string | null
  toUserId: string | null
  changedByUserId: string
  changedAt: Date
}

export interface LeadCommentRecord {
  id: string
  leadId: string
  userId: string
  text: string
  createdAt: Date
}

export interface NewLeadCommentInput {
  leadId: string
  userId: string
  text: string
}

export interface WonValueFilter {
  organizationId: string
  assignedUserId?: string
  wonFrom: Date
  wonTo: Date
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

  /** Lead existente com este telefone na organização (compara só os dígitos,
   * ignora formatação), ou null se não houver — usado pra impedir 2 leads com
   * o mesmo telefone na mesma org (CreateLeadUseCase/UpdateLeadUseCase).
   * excludeLeadId ignora o próprio lead ao validar uma edição de telefone. */
  findByPhone(
    organizationId: string,
    phone: string,
    excludeLeadId?: string,
  ): Promise<LeadRecord | null>

  /** Registra uma mudança de responsável para auditoria (AGENTS.md §10). */
  recordAssignmentChange(change: AssignmentChange): Promise<void>

  /** Histórico de mudanças de responsável, mais recente primeiro. */
  listAssignmentHistory(leadId: string): Promise<AssignmentHistoryRecord[]>

  /** Comentários/anotações internas do lead, mais recente primeiro. */
  listComments(leadId: string): Promise<LeadCommentRecord[]>

  createComment(input: NewLeadCommentInput): Promise<LeadCommentRecord>

  /** Soma de valueCents (valor do crédito) dos leads marcados como Ganho em
   * [wonFrom, wonTo) no funil padrão da organização — o funil comercial, base
   * do "realizado" das metas de vendas. Leads de outros funis (ex: cópias do
   * "passar o bastão" no pós-venda) não contam, pra não somar a mesma venda
   * duas vezes. Com assignedUserId, soma só os leads daquele responsável. */
  sumWonValueCentsInDefaultFunnel(filter: WonValueFilter): Promise<number>
}
