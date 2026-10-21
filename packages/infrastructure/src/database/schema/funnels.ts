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
// Desde o funil ADM fixo, o Ganho de um funil de vendas sempre vai pro ADM e
// este campo não é mais usado (fica só pelo histórico dos dados).
//
// kind: 'SALES' (funis de venda, configuráveis) ou 'BACKOFFICE' — o funil ADM
// do pós-venda, criado pelo sistema, com etapas fixas (não renomeia, não
// edita etapas, não exclui). Exatamente um BACKOFFICE por organização
// (índice único parcial). Ver application/src/funnels/backoffice-funnel.ts.

import { sql } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export const funnels = pgTable(
  'funnels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    duplicateToFunnelId: uuid('duplicate_to_funnel_id').references((): AnyPgColumn => funnels.id, {
      onDelete: 'set null',
    }),
    kind: text('kind').$type<'SALES' | 'BACKOFFICE'>().notNull().default('SALES'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('funnels_one_backoffice_per_org_idx')
      .on(table.organizationId)
      .where(sql`${table.kind} = 'BACKOFFICE'`),
  ],
)

export type DbFunnel = typeof funnels.$inferSelect
export type NewDbFunnel = typeof funnels.$inferInsert
