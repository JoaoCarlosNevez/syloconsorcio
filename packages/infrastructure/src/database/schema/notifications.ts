// Schema: notifications
//
// Notificações in-app de cada usuário — alimentam o sininho. Por enquanto só
// de tarefas (atribuída, perto do prazo, atrasada, concluída por outra pessoa).
//
// task_id tem FK com cascade: apagar a tarefa apaga as notificações dela, em
// vez de deixar o sininho apontando pra algo que não existe mais.
//
// dedupe_key existe pros lembretes gerados automaticamente ("vence em breve",
// "atrasada"): eles são criados de forma idempotente a cada leitura do sininho
// (INSERT ... ON CONFLICT DO NOTHING). A chave inclui o prazo da tarefa, então
// remarcar o prazo gera um lembrete novo. Notificações disparadas por ação de
// alguém (ex: atribuição) não têm chave — cada evento é uma notificação.

import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { tasks } from './tasks'
import { users } from './users'

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Quem causou a notificação; null nos lembretes automáticos.
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    type: text('type').notNull(),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
    // Título da tarefa no momento do evento.
    title: text('title').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    dedupeKey: text('dedupe_key'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('notifications_user_org_created_idx').on(
      table.userId,
      table.organizationId,
      table.createdAt,
    ),
    uniqueIndex('notifications_user_dedupe_key_idx').on(table.userId, table.dedupeKey),
  ],
)

export type DbNotification = typeof notifications.$inferSelect
export type NewDbNotification = typeof notifications.$inferInsert
