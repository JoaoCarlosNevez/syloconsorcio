// Schema: funnel_stages
//
// Estágios de um funil, em ordem (position, 0-based). Sem UNIQUE(funnelId,
// position) de propósito — a lista inteira é sempre reescrita a cada PATCH de
// funil (ver DrizzleFunnelRepository.update), então nunca há duas linhas com
// a mesma posição dentro da mesma transação.
//
// color é um hex único por estágio (ex: '#2563eb'); o frontend deriva as 4
// tonalidades visuais (headerBg/headerBorder/headerText/countText) a partir
// dele — ver apps/web/src/lib/stage-colors.ts. Evita persistir 4 colunas de
// cor por estágio.

import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { funnels } from './funnels'

export const funnelStages = pgTable('funnel_stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  funnelId: uuid('funnel_id')
    .notNull()
    .references(() => funnels.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#64748b'),
  position: integer('position').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbFunnelStage = typeof funnelStages.$inferSelect
export type NewDbFunnelStage = typeof funnelStages.$inferInsert
