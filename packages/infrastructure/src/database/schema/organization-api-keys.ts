// Schema: organization_api_keys
//
// Chaves de API por organização — autenticam o webhook de criação de leads
// (POST /webhooks/leads). A chave em si nunca é guardada: só o SHA-256 dela
// (key_hash, único) e um prefixo curto pra pessoa reconhecer qual é qual na
// tela. A chave completa aparece uma única vez, quando é criada.
//
// Revogar não apaga a linha (revoked_at): o histórico de quem criou/quando
// continua, e a chave para de funcionar na hora.

import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'

export const organizationApiKeys = pgTable(
  'organization_api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    /** Nome dado por quem criou (ex: "Landing page", "RD Station"). */
    name: text('name').notNull(),
    /** Começo da chave (ex: "sylo_a1B2c3D4") — só pra identificação visual. */
    keyPrefix: text('key_prefix').notNull(),
    keyHash: text('key_hash').notNull().unique(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('organization_api_keys_org_idx').on(table.organizationId)],
)

export type DbOrganizationApiKey = typeof organizationApiKeys.$inferSelect
export type NewDbOrganizationApiKey = typeof organizationApiKeys.$inferInsert
