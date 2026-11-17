// Schema: administrators
//
// Administradoras de consórcio com que a organização trabalha (Porto,
// Embracon, Rodobens…), cadastradas em Configurações → Administradoras. O
// nome aparece como sugestão no campo "Administradora" da ficha de adesão, e
// os e-mails são o destino do "Enviar ficha pra administradora".
//
// emails: um ou mais endereços (ex: cadastro@ e operacional@). Nome único por
// organização, sem diferenciar maiúsculas.

import { sql } from 'drizzle-orm'
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export const administrators = pgTable(
  'administrators',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    emails: text('emails').array().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('administrators_org_name_idx').on(table.organizationId, sql`lower(${table.name})`),
  ],
)

export type DbAdministrator = typeof administrators.$inferSelect
