// Schema: activity_log
//
// Log de atividades da organização — alimenta Configurações > Atividade.
// Somente inserts. entity_id não tem FK de propósito: o evento sobrevive à
// exclusão da entidade (ex: "lead apagado"), e entity_label/metadata guardam
// o que era preciso pra exibir a frase no momento do evento.

import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'

export const activityLog = pgTable(
  'activity_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    // Null quando a ação foi automática (ex: cópia do "passar o bastão") ou
    // quando o usuário foi excluído depois (set null mantém o evento).
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id'),
    entityLabel: text('entity_label'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('activity_log_org_created_idx').on(table.organizationId, table.createdAt)],
)

export type DbActivityLog = typeof activityLog.$inferSelect
export type NewDbActivityLog = typeof activityLog.$inferInsert
