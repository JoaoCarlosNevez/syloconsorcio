// Schema: lead_adhesions
//
// Ficha (checklist) de adesão do lead, preenchida ainda na etapa da venda:
// os dados que o vendedor/administrativo vai usar pra fazer a adesão na
// administradora. Uma por lead (lead_id é a chave).
//
// Os dados pessoais que o lead já tem (nome, telefone, e-mail, profissão,
// renda, estado civil, CPF) continuam em leads — a ficha edita eles lá. Aqui
// ficam só os dados da venda/plano e os pessoais que não existem no lead.

import { bigint, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
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
  downPaymentCents: bigint('down_payment_cents', { mode: 'number' }),
  prepaidInstallments: integer('prepaid_installments'),
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
