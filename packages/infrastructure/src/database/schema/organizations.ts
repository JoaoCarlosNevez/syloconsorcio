// Schema: organizations
//
// Hierarquia: INCORPORADORA → MASTER → REPRESENTACAO
// REPRESENTACAO com parent_organization_id = null é independente.

import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const organizationTypeEnum = pgEnum('organization_type', [
  'INCORPORADORA',
  'MASTER',
  'REPRESENTACAO',
])

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: organizationTypeEnum('type').notNull(),
  parentOrganizationId: uuid('parent_organization_id').references(
    // Self-referential FK — AnyPgColumn is the correct return type for Drizzle
    (): AnyPgColumn => organizations.id,
  ),
  // Identidade visual (AGENTS.md §11): por padrão toda Representação usa a
  // marca Sylo. Só organizações White Label podem definir um ícone próprio —
  // ver branding.iconUrl, só respeitado pelo frontend quando isWhiteLabel=true.
  isWhiteLabel: boolean('is_white_label').notNull().default(false),
  branding: jsonb('branding'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbOrganization = typeof organizations.$inferSelect
export type NewDbOrganization = typeof organizations.$inferInsert
