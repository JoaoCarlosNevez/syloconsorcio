// Schema: lead_proposals
//
// Uma proposta/simulação de crédito aprovada pra um lead. Diferente dos dados
// de qualificação em leads.ts (profissão, renda, estado civil, CPF — do
// cliente, compartilhados), valor de entrada e prazo são específicos de CADA
// proposta: o mesmo lead pode ter várias propostas com entrada/prazo
// diferentes. Os valores nunca são editados — uma proposta é substituída por
// uma nova simulação (ver LeadModal, aba Simulações); só o compartilhamento
// (link público e aberturas) é atualizado depois.
//
// Parcelas NÃO são calculadas: calcular parcela de consórcio de verdade exige
// taxa de administração, fundo de reserva e seguro (nenhum modelado ainda). O
// vendedor digita o valor que a tabela da administradora dá, em faixas (ex:
// da 1ª à 12ª R$ 1.500, as demais R$ 1.200) — ver installments abaixo.

import type { ProposalInstallmentRange } from '@sylocrm/application'
import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { leads } from './leads'
import { users } from './users'

export const leadProposals = pgTable('lead_proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id')
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  downPaymentCents: integer('down_payment_cents').notNull(),
  termMonths: integer('term_months').notNull(),
  // Nome da tabela da administradora usada na simulação (ex: "Tabela Imóvel
  // 2026"). Opcional — propostas antigas não têm.
  tableName: text('table_name'),
  // Faixas de parcelas [{ from, to, amountCents }], em ordem e cobrindo
  // 1..termMonths (validado no CreateLeadProposalUseCase). Opcional —
  // propostas antigas não têm.
  installments: jsonb('installments').$type<ProposalInstallmentRange[]>(),
  // Quem gerou a simulação — aparece no histórico do lead. Null nas propostas
  // anteriores à coluna cujo autor não foi achado no activity_log.
  createdByUserId: uuid('created_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  // Link público da proposta (/p/:token) — token aleatório, gerado só quando
  // o vendedor pede o link. Quem abrir o link vê a proposta sem login, então
  // o token é a única proteção: nunca derive dele nada previsível.
  shareToken: text('share_token').unique(),
  sharedByUserId: uuid('shared_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  // Aberturas do link público pelo cliente.
  viewCount: integer('view_count').notNull().default(0),
  lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbLeadProposal = typeof leadProposals.$inferSelect
export type NewDbLeadProposal = typeof leadProposals.$inferInsert
