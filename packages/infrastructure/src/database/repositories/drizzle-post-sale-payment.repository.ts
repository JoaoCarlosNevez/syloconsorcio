// DrizzlePostSalePaymentRepository — confirmação mensal do boleto no
// Pós-venda (ver IPostSalePaymentRepository).

import type {
  IPostSalePaymentRepository,
  NewAutoTaskInput,
  OpenAutoTask,
  PostSalePaymentLead,
} from '@sylocrm/application'
import { and, eq, inArray, isNotNull, isNull, like, ne, sql } from 'drizzle-orm'
import type { Database } from '../client'
import { funnels, leadAdhesions, leads, tasks } from '../schema'

export class DrizzlePostSalePaymentRepository implements IPostSalePaymentRepository {
  constructor(private readonly db: Database) {}

  async listOpenLeadsWithDueDay(): Promise<PostSalePaymentLead[]> {
    const rows = await this.db
      .select({
        leadId: leads.id,
        organizationId: leads.organizationId,
        name: leads.name,
        assignedUserId: leads.assignedUserId,
        createdAt: leads.createdAt,
        dueDay: leadAdhesions.installmentDueDay,
      })
      .from(leads)
      .innerJoin(funnels, eq(funnels.id, leads.funnelId))
      .innerJoin(leadAdhesions, eq(leadAdhesions.leadId, leads.id))
      .where(
        and(
          eq(funnels.kind, 'POST_SALE'),
          isNull(leads.wonAt),
          isNull(leads.lostAt),
          isNotNull(leadAdhesions.installmentDueDay),
        ),
      )
    return rows.flatMap((row) => (row.dueDay ? [{ ...row, dueDay: row.dueDay }] : []))
  }

  async createAutoTask(input: NewAutoTaskInput): Promise<boolean> {
    const rows = await this.db
      .insert(tasks)
      .values({
        organizationId: input.organizationId,
        leadId: input.leadId,
        assignedUserId: input.assignedUserId,
        createdByUserId: input.assignedUserId,
        type: 'Follow-up',
        title: input.title,
        notes: input.notes,
        dueAt: input.dueAt,
        autoKey: input.autoKey,
      })
      .onConflictDoNothing({ target: tasks.autoKey })
      .returning({ id: tasks.id })
    return rows.length > 0
  }

  async deleteOrphanAutoTasks(autoKeyPrefix: string): Promise<number> {
    // Cards que ainda estão em aberto no Pós-venda — o resto perde a tarefa.
    const stillOpen = this.db
      .select({ id: leads.id })
      .from(leads)
      .innerJoin(funnels, eq(funnels.id, leads.funnelId))
      .where(and(eq(funnels.kind, 'POST_SALE'), isNull(leads.wonAt), isNull(leads.lostAt)))
    const rows = await this.db
      .delete(tasks)
      .where(
        and(
          like(tasks.autoKey, `${autoKeyPrefix}%`),
          ne(tasks.status, 'concluida'),
          sql`${tasks.leadId} not in ${stillOpen}`,
        ),
      )
      .returning({ id: tasks.id })
    return rows.length
  }

  async findOpenAutoTasks(leadId: string, autoKeyPrefix: string): Promise<OpenAutoTask[]> {
    const rows = await this.db
      .select({ id: tasks.id, autoKey: tasks.autoKey, title: tasks.title, dueAt: tasks.dueAt })
      .from(tasks)
      .where(
        and(
          eq(tasks.leadId, leadId),
          like(tasks.autoKey, `${autoKeyPrefix}%`),
          ne(tasks.status, 'concluida'),
        ),
      )
    return rows.flatMap((row) => (row.autoKey ? [{ ...row, autoKey: row.autoKey }] : []))
  }

  async completeTasks(taskIds: string[], completedAt: Date): Promise<void> {
    if (taskIds.length === 0) return
    await this.db
      .update(tasks)
      .set({ status: 'concluida', completedAt, updatedAt: completedAt })
      .where(inArray(tasks.id, taskIds))
  }
}
