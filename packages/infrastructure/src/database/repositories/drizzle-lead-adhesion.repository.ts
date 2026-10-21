// DrizzleLeadAdhesionRepository — implementação concreta de ILeadAdhesionRepository.
//
// ADR-02: Drizzle é o único ORM. Seleção explícita de colunas (AGENTS.md §10).

import type {
  ILeadAdhesionRepository,
  LeadAdhesionFields,
  LeadAdhesionRecord,
} from '@sylocrm/application'
import { eq } from 'drizzle-orm'
import type { Database } from '../client'
import { leadAdhesions } from '../schema'

const ADHESION_COLUMNS = {
  leadId: leadAdhesions.leadId,
  organizationId: leadAdhesions.organizationId,
  administrator: leadAdhesions.administrator,
  sellerUserId: leadAdhesions.sellerUserId,
  assetValueCents: leadAdhesions.assetValueCents,
  assetCode: leadAdhesions.assetCode,
  planTable: leadAdhesions.planTable,
  assetType: leadAdhesions.assetType,
  groupCode: leadAdhesions.groupCode,
  downPaymentCents: leadAdhesions.downPaymentCents,
  prepaidInstallments: leadAdhesions.prepaidInstallments,
  birthplace: leadAdhesions.birthplace,
  spouseName: leadAdhesions.spouseName,
  phone2: leadAdhesions.phone2,
  address: leadAdhesions.address,
  zipCode: leadAdhesions.zipCode,
  preferredAdministrator: leadAdhesions.preferredAdministrator,
  contactHours: leadAdhesions.contactHours,
  notes: leadAdhesions.notes,
  updatedByUserId: leadAdhesions.updatedByUserId,
  createdAt: leadAdhesions.createdAt,
  updatedAt: leadAdhesions.updatedAt,
} as const

export class DrizzleLeadAdhesionRepository implements ILeadAdhesionRepository {
  constructor(private readonly db: Database) {}

  async findByLead(leadId: string): Promise<LeadAdhesionRecord | null> {
    const rows = await this.db
      .select(ADHESION_COLUMNS)
      .from(leadAdhesions)
      .where(eq(leadAdhesions.leadId, leadId))
      .limit(1)
    return rows[0] ?? null
  }

  async upsert(
    input: LeadAdhesionFields & { leadId: string; organizationId: string; updatedByUserId: string },
  ): Promise<LeadAdhesionRecord> {
    const { leadId, organizationId, ...fields } = input
    const now = new Date()
    const rows = await this.db
      .insert(leadAdhesions)
      .values({ leadId, organizationId, ...fields, updatedAt: now })
      .onConflictDoUpdate({ target: leadAdhesions.leadId, set: { ...fields, updatedAt: now } })
      .returning(ADHESION_COLUMNS)
    const row = rows[0]
    if (!row) throw new Error('Failed to save lead adhesion: no row returned')
    return row
  }
}
