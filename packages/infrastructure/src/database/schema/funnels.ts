// Schema: funnels
//
// Um funil é um pipeline de vendas independente dentro de uma organização —
// uma organização pode ter vários (ex: "Imobiliário", "Consórcio Pesado").
// Exatamente um funil por organização deve ter isDefault=true — invariante
// mantida pelos use cases (DrizzleFunnelRepository.update), não por constraint
// de banco, pra evitar a complexidade de um unique index parcial deferrable.
//
// duplicateToFunnelId: gatilho opcional de "passar o bastão" — quando um lead
// deste funil é marcado como Ganho, uma cópia dele é criada automaticamente no
// primeiro estágio do funil apontado aqui (ver update-lead.use-case.ts). Self-
// referencial (aponta pra outro funil, nunca ele mesmo — validado no use case);
// onDelete: 'set null' pra não travar a exclusão do funil de destino.

import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export const funnels = pgTable('funnels', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  duplicateToFunnelId: uuid('duplicate_to_funnel_id').references((): AnyPgColumn => funnels.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbFunnel = typeof funnels.$inferSelect
export type NewDbFunnel = typeof funnels.$inferInsert
