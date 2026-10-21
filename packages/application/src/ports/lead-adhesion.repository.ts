// ILeadAdhesionRepository — port da ficha (checklist) de adesão do lead.
//
// Definido na camada Application (o consumidor define o contrato).
// Implementação concreta: packages/infrastructure/src/database/repositories/
//
// Uma ficha por lead. Dados pessoais que o lead já tem ficam no lead — ver
// schema/lead-adhesions.ts.

/** Campos editáveis da ficha — todos opcionais (vazio = null). */
export interface LeadAdhesionFields {
  administrator: string | null
  sellerUserId: string | null
  assetValueCents: number | null
  assetCode: string | null
  planTable: string | null
  assetType: string | null
  groupCode: string | null
  downPaymentCents: number | null
  prepaidInstallments: number | null
  birthplace: string | null
  spouseName: string | null
  phone2: string | null
  address: string | null
  zipCode: string | null
  preferredAdministrator: string | null
  contactHours: string | null
  notes: string | null
}

export interface LeadAdhesionRecord extends LeadAdhesionFields {
  leadId: string
  organizationId: string
  updatedByUserId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ILeadAdhesionRepository {
  findByLead(leadId: string): Promise<LeadAdhesionRecord | null>

  /** Cria a ficha do lead ou substitui os campos da existente. */
  upsert(
    input: LeadAdhesionFields & { leadId: string; organizationId: string; updatedByUserId: string },
  ): Promise<LeadAdhesionRecord>
}
