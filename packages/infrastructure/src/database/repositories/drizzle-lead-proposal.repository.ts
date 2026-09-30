// DrizzleLeadProposalRepository — implementação concreta de ILeadProposalRepository.
//
// ADR-02: Drizzle é o único ORM. Seleção explícita de colunas (AGENTS.md §10).

import type {
  ILeadProposalRepository,
  LeadProposalRecord,
  NewLeadProposalInput,
} from '@sylocrm/application'
import { desc, eq } from 'drizzle-orm'
import type { Database } from '../client'
import { leadProposals } from '../schema'

const LEAD_PROPOSAL_COLUMNS = {
  id: leadProposals.id,
  leadId: leadProposals.leadId,
  downPaymentCents: leadProposals.downPaymentCents,
  termMonths: leadProposals.termMonths,
  tableName: leadProposals.tableName,
  createdAt: leadProposals.createdAt,
} as const

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
      })
      .returning(LEAD_PROPOSAL_COLUMNS)

    const row = rows[0]
    if (!row) throw new Error('Failed to create lead proposal: no row returned')
    return row
  }
}
