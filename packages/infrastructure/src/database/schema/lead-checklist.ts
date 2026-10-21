// Schema: lead_checklist_items
//
// Itens marcados do checklist do funil do lead (ADM e Pós-venda — os itens de
// cada funil ficam em application/src/funnels/funnel-checklists.ts). Uma linha
// por item marcado; desmarcar apaga a linha. Quem marcou e quando vão pro
// histórico do lead e pras conquistas (ex: "1ª parcela paga").

import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { leads } from './leads'
import { users } from './users'

export const leadChecklistItems = pgTable(
  'lead_checklist_items',
  {
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    itemKey: text('item_key').notNull(),
    checkedByUserId: uuid('checked_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.leadId, table.itemKey] })],
)

export type DbLeadChecklistItem = typeof leadChecklistItems.$inferSelect
