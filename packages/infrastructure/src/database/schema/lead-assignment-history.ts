// Schema: lead_assignment_history
//
// Registra cada mudança de responsável por um lead (AGENTS.md §10 — toda
// movimentação relevante de lead deve ser auditável). Somente inserts —
// nunca é atualizado ou apagado.

import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'
import { leads } from './leads'
import { users } from './users'

export const leadAssignmentHistory = pgTable('lead_assignment_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id')
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  fromUserId: uuid('from_user_id').references(() => users.id),
  toUserId: uuid('to_user_id').references(() => users.id),
  changedByUserId: uuid('changed_by_user_id')
    .notNull()
    .references(() => users.id),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbLeadAssignmentHistory = typeof leadAssignmentHistory.$inferSelect
export type NewDbLeadAssignmentHistory = typeof leadAssignmentHistory.$inferInsert
