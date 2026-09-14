// Schema: leads
//
// stage segue as colunas fixas do Kanban (ver apps/web/src/data/kanban-mock.ts).
// valueCents guarda o valor da cota em centavos — nunca ponto flutuante para dinheiro.
// stageChangedAt é atualizado sempre que `stage` muda, e alimenta métricas de
// tempo-na-etapa; o histórico de responsável fica em lead_assignment_history.

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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbLead = typeof leads.$inferSelect
export type NewDbLead = typeof leads.$inferInsert
