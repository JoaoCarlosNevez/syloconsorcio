// DrizzleLeadAdhesionRepository — implementação concreta de ILeadAdhesionRepository.
//
// ADR-02: Drizzle é o único ORM. Seleção explícita de colunas (AGENTS.md §10).

import type {
  AdhesionDocumentKind,
  AdhesionQuotaFields,
  ILeadAdhesionRepository,
  LeadAdhesionDocumentRecord,
  LeadAdhesionFields,
  LeadAdhesionRecord,
} from '@sylocrm/application'
import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '../client'
import {
  type DbLeadAdhesionDocument,
  leadAdhesionDocuments,
  leadAdhesionQuotas,
  leadAdhesions,
} from '../schema'

const DOCUMENT_COLUMNS = {
  id: leadAdhesionDocuments.id,
  leadId: leadAdhesionDocuments.leadId,
  organizationId: leadAdhesionDocuments.organizationId,
  kind: leadAdhesionDocuments.kind,
  fileName: leadAdhesionDocuments.fileName,
  storagePath: leadAdhesionDocuments.storagePath,
  contentType: leadAdhesionDocuments.contentType,
  sizeBytes: leadAdhesionDocuments.sizeBytes,
  uploadedByUserId: leadAdhesionDocuments.uploadedByUserId,
  createdAt: leadAdhesionDocuments.createdAt,
} as const

function toDocument(
  row: Pick<DbLeadAdhesionDocument, keyof typeof DOCUMENT_COLUMNS>,
): LeadAdhesionDocumentRecord {
  return { ...row, kind: row.kind as AdhesionDocumentKind }
}

const ADHESION_COLUMNS = {
  leadId: leadAdhesions.leadId,
  organizationId: leadAdhesions.organizationId,
  sellerUserId: leadAdhesions.sellerUserId,
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

const QUOTA_COLUMNS = {
  administrator: leadAdhesionQuotas.administrator,
  assetValueCents: leadAdhesionQuotas.assetValueCents,
  assetCode: leadAdhesionQuotas.assetCode,
  planTable: leadAdhesionQuotas.planTable,
  assetType: leadAdhesionQuotas.assetType,
  groupCode: leadAdhesionQuotas.groupCode,
  quotaNumber: leadAdhesionQuotas.quotaNumber,
  downPaymentCents: leadAdhesionQuotas.downPaymentCents,
  prepaidInstallments: leadAdhesionQuotas.prepaidInstallments,
  paymentMethod: leadAdhesionQuotas.paymentMethod,
  installmentDueDay: leadAdhesionQuotas.installmentDueDay,
} as const

export class DrizzleLeadAdhesionRepository implements ILeadAdhesionRepository {
  constructor(private readonly db: Database) {}

  private listQuotas(db: Pick<Database, 'select'>, leadId: string): Promise<AdhesionQuotaFields[]> {
    return db
      .select(QUOTA_COLUMNS)
      .from(leadAdhesionQuotas)
      .where(eq(leadAdhesionQuotas.leadId, leadId))
      .orderBy(asc(leadAdhesionQuotas.position))
  }

  async findByLead(leadId: string): Promise<LeadAdhesionRecord | null> {
    const rows = await this.db
      .select(ADHESION_COLUMNS)
      .from(leadAdhesions)
      .where(eq(leadAdhesions.leadId, leadId))
      .limit(1)
    const row = rows[0]
    if (!row) return null
    return { ...row, quotas: await this.listQuotas(this.db, leadId) }
  }

  async upsert(
    input: LeadAdhesionFields & { leadId: string; organizationId: string; updatedByUserId: string },
  ): Promise<LeadAdhesionRecord> {
    const { leadId, organizationId, quotas, ...fields } = input
    const now = new Date()
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .insert(leadAdhesions)
        .values({ leadId, organizationId, ...fields, updatedAt: now })
        .onConflictDoUpdate({ target: leadAdhesions.leadId, set: { ...fields, updatedAt: now } })
        .returning(ADHESION_COLUMNS)
      const row = rows[0]
      if (!row) throw new Error('Failed to save lead adhesion: no row returned')
      // As cotas são sempre a lista inteira, na ordem — substitui as antigas.
      await tx.delete(leadAdhesionQuotas).where(eq(leadAdhesionQuotas.leadId, leadId))
      if (quotas.length > 0) {
        await tx
          .insert(leadAdhesionQuotas)
          .values(quotas.map((quota, index) => ({ ...quota, leadId, position: index + 1 })))
      }
      return { ...row, quotas: await this.listQuotas(tx, leadId) }
    })
  }

  async listDocuments(leadId: string): Promise<LeadAdhesionDocumentRecord[]> {
    const rows = await this.db
      .select(DOCUMENT_COLUMNS)
      .from(leadAdhesionDocuments)
      .where(eq(leadAdhesionDocuments.leadId, leadId))
      .orderBy(asc(leadAdhesionDocuments.createdAt))
    return rows.map(toDocument)
  }

  async replaceDocument(input: Omit<LeadAdhesionDocumentRecord, 'id' | 'createdAt'>): Promise<{
    document: LeadAdhesionDocumentRecord
    previous: LeadAdhesionDocumentRecord | null
  }> {
    return this.db.transaction(async (tx) => {
      const previousRows = await tx
        .delete(leadAdhesionDocuments)
        .where(
          and(
            eq(leadAdhesionDocuments.leadId, input.leadId),
            eq(leadAdhesionDocuments.kind, input.kind),
          ),
        )
        .returning(DOCUMENT_COLUMNS)
      const rows = await tx.insert(leadAdhesionDocuments).values(input).returning(DOCUMENT_COLUMNS)
      const row = rows[0]
      if (!row) throw new Error('Failed to save adhesion document: no row returned')
      return {
        document: toDocument(row),
        previous: previousRows[0] ? toDocument(previousRows[0]) : null,
      }
    })
  }

  async deleteDocument(
    leadId: string,
    documentId: string,
  ): Promise<LeadAdhesionDocumentRecord | null> {
    const rows = await this.db
      .delete(leadAdhesionDocuments)
      .where(
        and(eq(leadAdhesionDocuments.id, documentId), eq(leadAdhesionDocuments.leadId, leadId)),
      )
      .returning(DOCUMENT_COLUMNS)
    return rows[0] ? toDocument(rows[0]) : null
  }
}
