// Schema: lead_proposals
//
// Uma proposta/simulação de crédito aprovada pra um lead. Diferente dos dados
// de qualificação em leads.ts (profissão, renda, estado civil, CPF — do
// cliente, compartilhados), valor de entrada e prazo são específicos de CADA
// proposta: o mesmo lead pode ter várias propostas com entrada/prazo
// diferentes. Só inserts — uma proposta nunca é editada, só substituída por
// uma nova simulação (ver LeadModal, aba Simulações).
//
// Sem valor de parcela de propósito: calcular parcela de consórcio de verdade
// exige taxa de administração, fundo de reserva e seguro (nenhum modelado
// ainda) — por enquanto a "aprovação" é só o efeito visual pedido, sem número
// financeiro incorreto na tela.

import { integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'
import { leads } from './leads'

export const leadProposals = pgTable('lead_proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id')
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  downPaymentCents: integer('down_payment_cents').notNull(),
  termMonths: integer('term_months').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbLeadProposal = typeof leadProposals.$inferSelect
export type NewDbLeadProposal = typeof leadProposals.$inferInsert
