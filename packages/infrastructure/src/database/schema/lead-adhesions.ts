// Schema: lead_adhesions
//
// Ficha (checklist) de adesão do lead, preenchida ainda na etapa da venda:
// os dados que o vendedor/administrativo vai usar pra fazer a adesão na
// administradora. Uma por lead (lead_id é a chave).
//
// Os dados pessoais que o lead já tem (nome, telefone, e-mail, profissão,
// renda, estado civil, CPF) continuam em leads — a ficha edita eles lá. Aqui
// ficam só os dados da venda/plano e os pessoais que não existem no lead.

import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { leads } from './leads'
import { organizations } from './organizations'
import { users } from './users'

export const leadAdhesions = pgTable('lead_adhesions', {
  leadId: uuid('lead_id')
    .primaryKey()
    .references(() => leads.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  // Venda
  /** Administradora ou intermediação por onde a cota vai ser feita. */
  administrator: text('administrator'),
  sellerUserId: uuid('seller_user_id').references(() => users.id, { onDelete: 'set null' }),
  // Plano
  assetValueCents: bigint('asset_value_cents', { mode: 'number' }),
  assetCode: text('asset_code'),
  planTable: text('plan_table'),
  assetType: text('asset_type'),
  groupCode: text('group_code'),
  /** Número da cota dentro do grupo (ex: 0123). */
  quotaNumber: text('quota_number'),
  downPaymentCents: bigint('down_payment_cents', { mode: 'number' }),
  prepaidInstallments: integer('prepaid_installments'),
  /** Boleto, débito em conta, cartão de crédito, PIX… */
  paymentMethod: text('payment_method'),
  /** Dia do mês do vencimento do boleto (1–31) — gera a tarefa mensal
   * "Confirmar pagamento" no Pós-venda (ver post-sale-payments.use-cases.ts). */
  installmentDueDay: integer('installment_due_day'),
  // Dados pessoais que o lead não tem
  birthplace: text('birthplace'),
  spouseName: text('spouse_name'),
  phone2: text('phone2'),
  address: text('address'),
  zipCode: text('zip_code'),
  // Preferências
  preferredAdministrator: text('preferred_administrator'),
  contactHours: text('contact_hours'),
  notes: text('notes'),
  updatedByUserId: uuid('updated_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbLeadAdhesion = typeof leadAdhesions.$inferSelect

// Documentos anexados à ficha de adesão — um arquivo vigente por tipo
// (enviar outro substitui). O arquivo fica no bucket PRIVADO lead-documents
// (ver PRIVATE_STORAGE_BUCKETS); aqui só os metadados e o caminho.
export const leadAdhesionDocuments = pgTable(
  'lead_adhesion_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    // identity_document | email_print | proof_of_address | handwritten_letter
    kind: text('kind').notNull(),
    fileName: text('file_name').notNull(),
    storagePath: text('storage_path').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('lead_adhesion_documents_lead_kind_idx').on(table.leadId, table.kind),
    index('lead_adhesion_documents_lead_idx').on(table.leadId),
  ],
)

export type DbLeadAdhesionDocument = typeof leadAdhesionDocuments.$inferSelect

// Cotas da ficha de adesão — uma venda pode ter várias (ex: 2 cotas em grupos
// diferentes pra fechar o valor). Dados do plano por cota; os pessoais ficam
// em lead_adhesions. Ao marcar Ganho, cada cota vira um card no ADM (e depois
// no Pós-venda), cada uma com o próprio boleto. As colunas de plano antigas
// de lead_adhesions foram copiadas pra cá como "Cota 1" (migration 0040) e
// não são mais usadas.
export const leadAdhesionQuotas = pgTable(
  'lead_adhesion_quotas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    /** 1, 2, 3… — ordem das cotas na ficha. */
    position: integer('position').notNull(),
    administrator: text('administrator'),
    assetValueCents: bigint('asset_value_cents', { mode: 'number' }),
    assetCode: text('asset_code'),
    planTable: text('plan_table'),
    assetType: text('asset_type'),
    groupCode: text('group_code'),
    quotaNumber: text('quota_number'),
    downPaymentCents: bigint('down_payment_cents', { mode: 'number' }),
    prepaidInstallments: integer('prepaid_installments'),
    paymentMethod: text('payment_method'),
    installmentDueDay: integer('installment_due_day'),
  },
  (table) => [
    uniqueIndex('lead_adhesion_quotas_lead_position_idx').on(table.leadId, table.position),
  ],
)

export type DbLeadAdhesionQuota = typeof leadAdhesionQuotas.$inferSelect
