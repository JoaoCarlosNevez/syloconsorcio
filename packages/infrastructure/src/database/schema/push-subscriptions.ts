// Schema: push_subscriptions
//
// Aparelhos (navegador/PWA) inscritos no Web Push de cada usuário. Um usuário
// pode ter vários (celular + notebook); o endpoint identifica o aparelho e é
// único — reinscrever o mesmo aparelho só atualiza as chaves.
//
// A inscrição é do usuário, não da organização: o push leva o organizationId
// da notificação e o app troca de organização ao abrir.

import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbPushSubscription = typeof pushSubscriptions.$inferSelect
