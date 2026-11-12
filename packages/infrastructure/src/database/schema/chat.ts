// Schema: chat interno (chat_conversations, chat_participants, chat_messages)
//
// Conversa entre vendas, ADM e pós-venda. Dois tipos:
//   - 'client': a conversa de um cliente. client_id é a chave do cliente
//     (coalesce(leads.client_id, leads.id)) — a mesma conversa segue o cliente
//     do Comercial pro ADM e pro Pós-venda. Sem FK de propósito (igual a
//     leads.client_id): é uma chave, não uma linha.
//   - 'direct': conversa entre duas pessoas; direct_key = os dois user ids em
//     ordem, separados por ':' — garante uma conversa só por par.
//
// chat_participants: quem acompanha a conversa (aparece na lista dele e
// recebe push) e até onde leu (last_read_at). Entra quem escreve, quem é
// avisado de uma mensagem e quem abre a conversa.
//
// chat_messages.kind: 'text' (mensagem) ou 'task' (tarefa criada pela
// conversa; task_id aponta pra ela e o card mostra o estado atual da tarefa).
// lead_id: o cliente anexado, em qualquer tipo de mensagem.

import { sql } from 'drizzle-orm'
import { index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { leads } from './leads'
import { organizations } from './organizations'
import { tasks } from './tasks'
import { users } from './users'

export const chatConversations = pgTable(
  'chat_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    kind: text('kind').notNull(),
    clientId: uuid('client_id'),
    directKey: text('direct_key'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('chat_conversations_client_idx')
      .on(table.organizationId, table.clientId)
      .where(sql`${table.clientId} IS NOT NULL`),
    uniqueIndex('chat_conversations_direct_idx')
      .on(table.organizationId, table.directKey)
      .where(sql`${table.directKey} IS NOT NULL`),
  ],
)

export const chatParticipants = pgTable(
  'chat_participants',
  {
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => chatConversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.userId] }),
    index('chat_participants_user_idx').on(table.userId),
  ],
)

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => chatConversations.id, { onDelete: 'cascade' }),
    authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
    kind: text('kind').notNull().default('text'),
    body: text('body').notNull(),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    // Cliente anexado à mensagem (mensagem direta mandada de dentro da ficha
    // do lead): o card "Cliente: <nome> · abrir ficha".
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('chat_messages_conversation_idx').on(table.conversationId, table.createdAt)],
)

export type DbChatConversation = typeof chatConversations.$inferSelect
export type DbChatMessage = typeof chatMessages.$inferSelect
