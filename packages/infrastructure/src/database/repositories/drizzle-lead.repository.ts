// DrizzleLeadRepository — implementação concreta de ILeadRepository.
//
// ADR-02: Drizzle é o único ORM. Queries passam sempre por este client.
// Seleção explícita de colunas em toda query (nunca SELECT *) — AGENTS.md §10.
// `organizationIds` vazio nunca deve virar "SELECT * FROM leads" — retorna
// vazio imediatamente em vez de emitir um `IN ()` inválido.

import type {
  AssignmentChange,
  AssignmentHistoryRecord,
  ILeadRepository,
  LeadCommentRecord,
  LeadListFilter,
  LeadListPage,
  LeadRecord,
  LeadScopeFilter,
  NewLeadCommentInput,
  NewLeadInput,
  UpdateLeadInput,
} from '@sylocrm/application'
import {
  and,
  arrayOverlaps,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from 'drizzle-orm'
import type { Database } from '../client'
import { type DbLead, leadAssignmentHistory, leadComments, leads } from '../schema'

const LEAD_COLUMNS = {
  id: leads.id,
  organizationId: leads.organizationId,
  name: leads.name,
  phone: leads.phone,
  email: leads.email,
  segment: leads.segment,
  valueCents: leads.valueCents,
  quotaCount: leads.quotaCount,
  source: leads.source,
  funnelId: leads.funnelId,
  stageId: leads.stageId,
  assignedUserId: leads.assignedUserId,
  stageChangedAt: leads.stageChangedAt,
  lostAt: leads.lostAt,
  wonAt: leads.wonAt,
  tags: leads.tags,
  notes: leads.notes,
  profession: leads.profession,
  incomeCents: leads.incomeCents,
  maritalStatus: leads.maritalStatus,
  cpf: leads.cpf,
  createdAt: leads.createdAt,
  updatedAt: leads.updatedAt,
} as const

const ASSIGNMENT_HISTORY_COLUMNS = {
  id: leadAssignmentHistory.id,
  leadId: leadAssignmentHistory.leadId,
  fromUserId: leadAssignmentHistory.fromUserId,
  toUserId: leadAssignmentHistory.toUserId,
  changedByUserId: leadAssignmentHistory.changedByUserId,
  changedAt: leadAssignmentHistory.changedAt,
} as const

const COMMENT_COLUMNS = {
  id: leadComments.id,
  leadId: leadComments.leadId,
  userId: leadComments.userId,
  text: leadComments.text,
  createdAt: leadComments.createdAt,
} as const

function toLeadRecord(row: DbLead): LeadRecord {
  return { ...row }
}

function buildScopeConditions(scope: LeadScopeFilter) {
  const conditions = [inArray(leads.organizationId, scope.organizationIds)]
  if (scope.assignedUserId) {
    conditions.push(eq(leads.assignedUserId, scope.assignedUserId))
  }
  return conditions
}

export class DrizzleLeadRepository implements ILeadRepository {
  constructor(private readonly db: Database) {}

  async list(filter: LeadListFilter, page: number, pageSize: number): Promise<LeadListPage> {
    if (filter.organizationIds.length === 0) {
      return { items: [], total: 0, page, pageSize }
    }

    // outcome particiona o funil em 3 buckets mutuamente exclusivos — aberto é
    // o padrão. 'todos' não filtra por outcome (mostra aberto+ganho+perdido
    // juntos). findById/update/delete não filtram por outcome (alcançam um
    // lead perdido/ganho normalmente, pra permitir reabrir via lost/won: false).
    const conditions = [...buildScopeConditions(filter)]
    const outcome = filter.outcome ?? 'aberto'
    if (outcome === 'perdido') {
      conditions.push(isNotNull(leads.lostAt))
    } else if (outcome !== 'todos') {
      conditions.push(isNull(leads.lostAt))
      conditions.push(outcome === 'ganho' ? isNotNull(leads.wonAt) : isNull(leads.wonAt))
    }
    if (filter.funnelId) {
      conditions.push(eq(leads.funnelId, filter.funnelId))
    }
    if (filter.stageId) {
      conditions.push(eq(leads.stageId, filter.stageId))
    }
    if (filter.tags && filter.tags.length > 0) {
      // Overlap (OR): retorna leads que tenham QUALQUER uma das tags pedidas.
      conditions.push(arrayOverlaps(leads.tags, filter.tags))
    }
    if (filter.search) {
      const pattern = `%${filter.search}%`
      const searchCondition = or(ilike(leads.name, pattern), ilike(leads.phone, pattern))
      if (searchCondition) conditions.push(searchCondition)
    }
    const where = and(...conditions)

    const [rows, countRows] = await Promise.all([
      this.db
        .select(LEAD_COLUMNS)
        .from(leads)
        .where(where)
        .orderBy(desc(leads.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db.select({ count: sql<number>`count(*)::int` }).from(leads).where(where),
    ])

    return {
      items: rows.map(toLeadRecord),
      total: countRows[0]?.count ?? 0,
      page,
      pageSize,
    }
  }

  async findById(id: string, scope: LeadScopeFilter): Promise<LeadRecord | null> {
    if (scope.organizationIds.length === 0) return null

    const rows = await this.db
      .select(LEAD_COLUMNS)
      .from(leads)
      .where(and(eq(leads.id, id), ...buildScopeConditions(scope)))
      .limit(1)

    const row = rows[0]
    return row ? toLeadRecord(row) : null
  }

  async create(input: NewLeadInput): Promise<LeadRecord> {
    const rows = await this.db
      .insert(leads)
      .values({
        organizationId: input.organizationId,
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
        segment: input.segment,
        valueCents: input.valueCents,
        quotaCount: input.quotaCount ?? 1,
        source: input.source,
        funnelId: input.funnelId,
        stageId: input.stageId,
        assignedUserId: input.assignedUserId ?? null,
        tags: input.tags ?? [],
        notes: input.notes ?? null,
        profession: input.profession ?? null,
        incomeCents: input.incomeCents ?? null,
        maritalStatus: input.maritalStatus ?? null,
        cpf: input.cpf ?? null,
      })
      .returning(LEAD_COLUMNS)

    const row = rows[0]
    if (!row) throw new Error('Failed to create lead: no row returned')
    return toLeadRecord(row)
  }

  async update(
    id: string,
    scope: LeadScopeFilter,
    input: UpdateLeadInput,
  ): Promise<LeadRecord | null> {
    if (scope.organizationIds.length === 0) return null

    const { lost, won, ...rest } = input

    const rows = await this.db
      .update(leads)
      .set({
        ...rest,
        updatedAt: new Date(),
        ...(input.stageId ? { stageChangedAt: new Date() } : {}),
        ...(lost !== undefined ? { lostAt: lost ? new Date() : null } : {}),
        ...(won !== undefined ? { wonAt: won ? new Date() : null } : {}),
      })
      .where(and(eq(leads.id, id), ...buildScopeConditions(scope)))
      .returning(LEAD_COLUMNS)

    const row = rows[0]
    return row ? toLeadRecord(row) : null
  }

  async findByPhone(
    organizationId: string,
    phone: string,
    excludeLeadId?: string,
  ): Promise<LeadRecord | null> {
    const digits = phone.replace(/\D/g, '')
    const conditions = [
      eq(leads.organizationId, organizationId),
      // Nota: '\D' não funciona como classe "não-dígito" no regexp_replace do
      // Postgres nesta instância (confirmado manualmente) — '[^0-9]' funciona.
      sql`regexp_replace(${leads.phone}, '[^0-9]', '', 'g') = ${digits}`,
    ]
    if (excludeLeadId) conditions.push(sql`${leads.id} != ${excludeLeadId}`)

    const rows = await this.db
      .select(LEAD_COLUMNS)
      .from(leads)
      .where(and(...conditions))
      .limit(1)

    const row = rows[0]
    return row ? toLeadRecord(row) : null
  }

  async delete(id: string, scope: LeadScopeFilter): Promise<boolean> {
    if (scope.organizationIds.length === 0) return false

    const rows = await this.db
      .delete(leads)
      .where(and(eq(leads.id, id), ...buildScopeConditions(scope)))
      .returning({ id: leads.id })

    return rows.length > 0
  }

  async recordAssignmentChange(change: AssignmentChange): Promise<void> {
    await this.db.insert(leadAssignmentHistory).values({
      leadId: change.leadId,
      fromUserId: change.fromUserId,
      toUserId: change.toUserId,
      changedByUserId: change.changedByUserId,
    })
  }

  async listAssignmentHistory(leadId: string): Promise<AssignmentHistoryRecord[]> {
    return this.db
      .select(ASSIGNMENT_HISTORY_COLUMNS)
      .from(leadAssignmentHistory)
      .where(eq(leadAssignmentHistory.leadId, leadId))
      .orderBy(desc(leadAssignmentHistory.changedAt))
  }

  async listComments(leadId: string): Promise<LeadCommentRecord[]> {
    return this.db
      .select(COMMENT_COLUMNS)
      .from(leadComments)
      .where(eq(leadComments.leadId, leadId))
      .orderBy(desc(leadComments.createdAt))
  }

  async createComment(input: NewLeadCommentInput): Promise<LeadCommentRecord> {
    const rows = await this.db
      .insert(leadComments)
      .values({ leadId: input.leadId, userId: input.userId, text: input.text })
      .returning(COMMENT_COLUMNS)

    const row = rows[0]
    if (!row) throw new Error('Failed to create comment: no row returned')
    return row
  }
}
