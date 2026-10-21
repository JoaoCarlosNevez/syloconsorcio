// ILeadChecklistRepository — itens marcados do checklist do funil do lead
// (ver funnels/funnel-checklists.ts).
// Implementação concreta: packages/infrastructure/src/database/repositories/

export interface CheckedItem {
  itemKey: string
  checkedByUserId: string | null
  checkedAt: Date
}

export interface ILeadChecklistRepository {
  listChecked(leadId: string): Promise<CheckedItem[]>
  check(leadId: string, itemKey: string, userId: string): Promise<CheckedItem>
  /** true se o item estava marcado. */
  uncheck(leadId: string, itemKey: string): Promise<boolean>
}
