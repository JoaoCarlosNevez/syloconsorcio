// Schema: fila de distribuição dos leads do webhook (Configurações > Fila de
// Leads). Ver ILeadQueueRepository pro funcionamento.
//
// lead_queue_settings  — uma linha por organização (sem linha = desligada).
// lead_queue_members   — quem participa; last_offered_at define a ordem
//                        (mais antigo = próximo).
// lead_offers          — cada vez que um lead foi oferecido a alguém. No
//                        máximo uma pendente por lead (índice parcial).

import { sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { leads } from './leads'
import { organizations } from './organizations'
import { users } from './users'

export const leadQueueSettings = pgTable('lead_queue_settings', {
  organizationId: uuid('organization_id')
    .primaryKey()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(false),
  timeoutMinutes: integer('timeout_minutes').notNull().default(5),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const leadQueueMembers = pgTable(
  'lead_queue_members',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lastOfferedAt: timestamp('last_offered_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.userId] })],
)

export const leadOffers = pgTable(
  'lead_offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // pending | accepted | declined | expired | cancelled
    status: text('status').notNull().default('pending'),
    offeredAt: timestamp('offered_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('lead_offers_one_pending_per_lead_idx')
      .on(table.leadId)
      .where(sql`${table.status} = 'pending'`),
    index('lead_offers_pending_expires_idx')
      .on(table.expiresAt)
      .where(sql`${table.status} = 'pending'`),
    index('lead_offers_lead_idx').on(table.leadId),
  ],
)

export type DbLeadOffer = typeof leadOffers.$inferSelect
