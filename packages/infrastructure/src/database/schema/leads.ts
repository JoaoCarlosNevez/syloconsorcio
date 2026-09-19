// Schema: leads
//
// stage segue as colunas fixas do Kanban (ver apps/web/src/data/kanban-mock.ts).
// valueCents guarda o valor da cota em centavos — nunca ponto flutuante para dinheiro.
// stageChangedAt é atualizado sempre que `stage` muda, e alimenta métricas de
// tempo-na-etapa; o histórico de responsável fica em lead_assignment_history.
// lostAt marca "Perdido": null enquanto o lead está ativo no funil. Ao ser
// marcado, o lead some do board (list() filtra lostAt IS NOT NULL) mas
// mantém o último stage alcançado — não existe stage "PERDIDO" separado.

import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'

export const leadStageEnum = pgEnum('lead_stage', [
  'LEAD',
  'ATENDIMENTO',
  'SIMULACAO',
  'PROPOSTA',
  'FECHADO',
  'VENDA',
])

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
  stage: leadStageEnum('stage').notNull().default('LEAD'),
  assignedUserId: uuid('assigned_user_id').references(() => users.id),
  stageChangedAt: timestamp('stage_changed_at', { withTimezone: true }).defaultNow().notNull(),
  lostAt: timestamp('lost_at', { withTimezone: true }),
  // Tags livres (ex: "Quente", "Frio") — um lead pode ter várias ao mesmo
  // tempo, diferente de segment/source. Vêm de organizations.leadTags, mas
  // não são validadas contra essa lista no banco (só sugeridas na UI).
  tags: text('tags').array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbLead = typeof leads.$inferSelect
export type NewDbLead = typeof leads.$inferInsert
