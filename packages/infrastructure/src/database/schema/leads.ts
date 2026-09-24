// Schema: leads
//
// funnelId/stageId apontam pro funil/estágio (dinâmicos, customizáveis por
// organização — ver schema/funnels.ts e funnel-stages.ts) em que o lead está.
// valueCents guarda o valor da cota em centavos — nunca ponto flutuante para dinheiro.
// stageChangedAt é atualizado sempre que `stageId` muda, e alimenta métricas de
// tempo-na-etapa; o histórico de responsável fica em lead_assignment_history.
// lostAt marca "Perdido" e wonAt marca "Ganho" — ambos independentes do
// estágio: null enquanto o lead está ativo/aberto. Nenhum dos dois muda
// `stageId` (reabrir um lead ganho/perdido não move ele de estágio).

import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { funnelStages } from './funnel-stages'
import { funnels } from './funnels'
import { organizations } from './organizations'
import { users } from './users'

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  segment: text('segment').notNull(),
  valueCents: integer('value_cents').notNull(),
  quotaCount: integer('quota_count').notNull().default(1),
  source: text('source').notNull(),
  // Funil e estágio — dinâmicos, definidos por organização em Configurações
  // (ver packages/application/src/ports/funnel.repository.ts). Todo lead
  // pertence a exatamente um funil, num estágio desse funil.
  funnelId: uuid('funnel_id')
    .notNull()
    .references(() => funnels.id),
  stageId: uuid('stage_id')
    .notNull()
    .references(() => funnelStages.id),
  assignedUserId: uuid('assigned_user_id').references(() => users.id),
  stageChangedAt: timestamp('stage_changed_at', { withTimezone: true }).defaultNow().notNull(),
  lostAt: timestamp('lost_at', { withTimezone: true }),
  // Marca "Ganho" — simétrico a lostAt, desacoplado do estágio (ver plano de
  // funis). Null enquanto o lead não foi ganho.
  wonAt: timestamp('won_at', { withTimezone: true }),
  // Tags livres (ex: "Quente", "Frio") — um lead pode ter várias ao mesmo
  // tempo, diferente de segment/source. Vêm de organizations.leadTags, mas
  // não são validadas contra essa lista no banco (só sugeridas na UI).
  tags: text('tags').array().notNull().default([]),
  notes: text('notes'),
  // Dados de qualificação do cliente (não do negócio) — compartilhados por
  // todas as propostas/simulações desse lead, por isso ficam aqui e não em
  // lead_proposals. Todos opcionais/nulos até o vendedor preencher a ficha.
  profession: text('profession'),
  incomeCents: integer('income_cents'),
  maritalStatus: text('marital_status'),
  cpf: text('cpf'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbLead = typeof leads.$inferSelect
export type NewDbLead = typeof leads.$inferInsert
