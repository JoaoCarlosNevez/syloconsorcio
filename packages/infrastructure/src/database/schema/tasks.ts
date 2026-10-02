// Schema: tasks
//
// Atividades/tarefas de acompanhamento (ligação, reunião, follow-up etc.),
// opcionalmente ligadas a um lead. leadId é nullable de propósito — nem toda
// tarefa é sobre um lead específico (ex: tarefas administrativas).
//
// status guarda só os 3 estados reais que alguém manipula ('pendente',
// 'em_andamento', 'concluida') — "atrasada" NÃO é persistido: é derivado em
// tempo de leitura (status != 'concluida' AND due_at < now()), senão a tarefa
// ficaria com o status errado até alguém tocar nela de novo.
//
// type é texto livre (não pg enum), mesmo padrão de leads.segment/source —
// os 6 valores hoje (Ligação, Reunião, Visita, Follow-up, Tarefa, Simulação)
// são só sugeridos pela UI.

import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { leads } from './leads'
import { organizations } from './organizations'
import { users } from './users'

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  assignedUserId: uuid('assigned_user_id')
    .notNull()
    .references(() => users.id),
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => users.id),
  type: text('type').notNull(),
  title: text('title').notNull(),
  notes: text('notes'),
  status: text('status').notNull().default('pendente'),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbTask = typeof tasks.$inferSelect
export type NewDbTask = typeof tasks.$inferInsert
