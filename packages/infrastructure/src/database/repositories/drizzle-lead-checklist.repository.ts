// DrizzleLeadChecklistRepository — itens marcados do checklist do funil do
// lead (ver ILeadChecklistRepository).

import type { CheckedItem, ILeadChecklistRepository } from '@sylocrm/application'
import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '../client'
import { leadChecklistItems } from '../schema'

const COLUMNS = {
  itemKey: leadChecklistItems.itemKey,
  checkedByUserId: leadChecklistItems.checkedByUserId,
  checkedAt: leadChecklistItems.checkedAt,
} as const

export class DrizzleLeadChecklistRepository implements ILeadChecklistRepository {
  constructor(private readonly db: Database) {}

  async listChecked(leadId: string): Promise<CheckedItem[]> {
    return this.db
      .select(COLUMNS)
      .from(leadChecklistItems)
      .where(eq(leadChecklistItems.leadId, leadId))
      .orderBy(asc(leadChecklistItems.checkedAt))
  }

  async check(leadId: string, itemKey: string, userId: string): Promise<CheckedItem> {
    const [row] = await this.db
      .insert(leadChecklistItems)
      .values({ leadId, itemKey, checkedByUserId: userId })
      .onConflictDoUpdate({
        target: [leadChecklistItems.leadId, leadChecklistItems.itemKey],
        set: { itemKey },
      })
      .returning(COLUMNS)
    if (!row) throw new Error('Failed to check item: no row returned')
    return row
  }

  async uncheck(leadId: string, itemKey: string): Promise<boolean> {
    const rows = await this.db
      .delete(leadChecklistItems)
      .where(and(eq(leadChecklistItems.leadId, leadId), eq(leadChecklistItems.itemKey, itemKey)))
      .returning({ itemKey: leadChecklistItems.itemKey })
    return rows.length > 0
  }
}
