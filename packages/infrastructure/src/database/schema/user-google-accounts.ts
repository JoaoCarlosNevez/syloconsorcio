// Schema: user_google_accounts
//
// Conta Google que o usuário conectou pra mandar e-mail pelo Gmail dele
// (ficha de adesão pra administradora). Uma por usuário — vale em todas as
// organizações dele. Só o escopo gmail.send: o CRM não lê a caixa de entrada.
//
// refresh_token_encrypted: o refresh token do Google, criptografado com
// AES-256-GCM (chave TOKEN_ENCRYPTION_KEY, só na API). Nunca sai da API.

import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

export const userGoogleAccounts = pgTable('user_google_accounts', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  googleEmail: text('google_email').notNull(),
  refreshTokenEncrypted: text('refresh_token_encrypted').notNull(),
  scopes: text('scopes').notNull(),
  connectedAt: timestamp('connected_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbUserGoogleAccount = typeof userGoogleAccounts.$inferSelect
