// DrizzleLeadProposalRepository — implementação concreta de ILeadProposalRepository.
//
// ADR-02: Drizzle é o único ORM. Seleção explícita de colunas (AGENTS.md §10).

import { randomBytes } from 'node:crypto'
import type {
  ILeadProposalRepository,
  LeadProposalRecord,
  NewLeadProposalInput,
  SharedLeadProposalRecord,
} from '@sylocrm/application'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import type { Database } from '../client'
import { leadProposals, leads } from '../schema'

const LEAD_PROPOSAL_COLUMNS = {
  id: leadProposals.id,
  leadId: leadProposals.leadId,
  downPaymentCents: leadProposals.downPaymentCents,
  termMonths: leadProposals.termMonths,
  tableName: leadProposals.tableName,
  installments: leadProposals.installments,
  shareToken: leadProposals.shareToken,
  viewCount: leadProposals.viewCount,
  lastViewedAt: leadProposals.lastViewedAt,
  createdAt: leadProposals.createdAt,
} as const

/** 24 bytes aleatórios → 32 caracteres base64url; impossível de adivinhar. */
function generateShareToken(): string {
  return randomBytes(24).toString('base64url')
}

export class DrizzleLeadProposalRepository implements ILeadProposalRepository {
  constructor(private readonly db: Database) {}

  async listByLead(leadId: string): Promise<LeadProposalRecord[]> {
    return this.db
      .select(LEAD_PROPOSAL_COLUMNS)
      .from(leadProposals)
      .where(eq(leadProposals.leadId, leadId))
      .orderBy(desc(leadProposals.createdAt))
  }

  async create(input: NewLeadProposalInput): Promise<LeadProposalRecord> {
    const rows = await this.db
      .insert(leadProposals)
      .values({
        leadId: input.leadId,
        downPaymentCents: input.downPaymentCents,
        termMonths: input.termMonths,
        tableName: input.tableName,
        installments: input.installments,
      })
      .returning(LEAD_PROPOSAL_COLUMNS)

    const row = rows[0]
    if (!row) throw new Error('Failed to create lead proposal: no row returned')
    return row
  }

  async findById(id: string): Promise<LeadProposalRecord | null> {
    const rows = await this.db
      .select(LEAD_PROPOSAL_COLUMNS)
      .from(leadProposals)
      .where(eq(leadProposals.id, id))
      .limit(1)
    return rows[0] ?? null
  }

  async enableSharing(id: string, sharedByUserId: string): Promise<string> {
    // Só grava se ainda não houver token — duas abas gerando o link ao mesmo
    // tempo ficam com o mesmo token (o segundo UPDATE não casa).
    await this.db
      .update(leadProposals)
      .set({ shareToken: generateShareToken(), sharedByUserId })
      .where(and(eq(leadProposals.id, id), isNull(leadProposals.shareToken)))

    const rows = await this.db
      .select({ shareToken: leadProposals.shareToken })
      .from(leadProposals)
      .where(eq(leadProposals.id, id))
      .limit(1)
    const token = rows[0]?.shareToken
    if (!token) throw new Error('Failed to enable proposal sharing: proposal not found')
    return token
  }

  async findByShareToken(token: string): Promise<SharedLeadProposalRecord | null> {
    const rows = await this.db
      .select({
        ...LEAD_PROPOSAL_COLUMNS,
        organizationId: leads.organizationId,
        sharedByUserId: leadProposals.sharedByUserId,
      })
      .from(leadProposals)
      .innerJoin(leads, eq(leads.id, leadProposals.leadId))
      .where(eq(leadProposals.shareToken, token))
      .limit(1)
    return rows[0] ?? null
  }

  async recordView(id: string, viewedAt: Date): Promise<void> {
    await this.db
      .update(leadProposals)
      .set({ viewCount: sql`${leadProposals.viewCount} + 1`, lastViewedAt: viewedAt })
      .where(eq(leadProposals.id, id))
  }
}
