// Schema: users
//
// ADR-12 (decisão 2): auth.users.id == users.id
// O ID do Supabase Auth é reutilizado como PK desta tabela.
// Não há mapeamento separado — o mesmo UUID serve os dois domínios.

import { boolean, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { pgTable } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  // Super Admin da plataforma — só quem tem esta flag pode criar novas
  // Representações (tenants). Não é um Role de Membership: é uma
  // capacidade de nível plataforma, independente de qualquer organização.
  isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbUser = typeof users.$inferSelect
export type NewDbUser = typeof users.$inferInsert
