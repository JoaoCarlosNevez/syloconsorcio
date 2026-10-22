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
  paymentMethod: string | null
  /** Dia do mês do vencimento do boleto (1–31). */
  installmentDueDay: number | null
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

/** Documentos da ficha — um arquivo vigente por tipo. */
export const ADHESION_DOCUMENT_KINDS = [
  'identity_document',
  'email_print',
  'proof_of_address',
  'handwritten_letter',
] as const
export type AdhesionDocumentKind = (typeof ADHESION_DOCUMENT_KINDS)[number]

export interface LeadAdhesionDocumentRecord {
  id: string
  leadId: string
  organizationId: string
  kind: AdhesionDocumentKind
  fileName: string
  /** Caminho no bucket privado lead-documents. */
  storagePath: string
  contentType: string
  sizeBytes: number
  uploadedByUserId: string | null
  createdAt: Date
}

export interface ILeadAdhesionRepository {
  findByLead(leadId: string): Promise<LeadAdhesionRecord | null>

  /** Cria a ficha do lead ou substitui os campos da existente. */
  upsert(
    input: LeadAdhesionFields & { leadId: string; organizationId: string; updatedByUserId: string },
  ): Promise<LeadAdhesionRecord>

  listDocuments(leadId: string): Promise<LeadAdhesionDocumentRecord[]>

  /** Grava o documento do tipo, substituindo o anterior. Devolve o anterior
   * (pra apagar o arquivo dele) ou null. */
  replaceDocument(
    input: Omit<LeadAdhesionDocumentRecord, 'id' | 'createdAt'>,
  ): Promise<{ document: LeadAdhesionDocumentRecord; previous: LeadAdhesionDocumentRecord | null }>

  /** Apaga e devolve o documento (null se não existir ou não for do lead). */
  deleteDocument(leadId: string, documentId: string): Promise<LeadAdhesionDocumentRecord | null>
}
