// Schema: lead_comments
//
// Comentários/anotações internas por lead — aparecem junto com o histórico de
// atribuição no feed "Histórico" da ficha do lead (aba "Comentários"/"Tudo").
// Somente inserts — não há edição nem exclusão de comentário hoje.

import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { leads } from './leads'
import { users } from './users'

export const leadComments = pgTable('lead_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id')
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  text: text('text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbLeadComment = typeof leadComments.$inferSelect
export type NewDbLeadComment = typeof leadComments.$inferInsert
