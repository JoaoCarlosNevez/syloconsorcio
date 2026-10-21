// DrizzleManagementDashboardRepository — leituras do painel de gestão (ver
// IManagementDashboardRepository). Só seleciona e agrupa; as contas ficam no
// GetManagementDashboardUseCase.

import type {
  AssigneePeriodStats,
  IManagementDashboardRepository,
  OpenLeadSnapshot,
} from '@sylocrm/application'
import { and, count, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import type { Database } from '../client'
import { funnels, leadOffers, leads } from '../schema'

export class DrizzleManagementDashboardRepository implements IManagementDashboardRepository {
  constructor(private readonly db: Database) {}

  async listOpenLeads(organizationId: string): Promise<OpenLeadSnapshot[]> {
    return this.db
      .select({
        id: leads.id,
        name: leads.name,
        funnelId: leads.funnelId,
        stageId: leads.stageId,
        assignedUserId: leads.assignedUserId,
        valueCents: leads.valueCents,
        stageChangedAt: leads.stageChangedAt,
      })
      .from(leads)
      .where(
        and(eq(leads.organizationId, organizationId), isNull(leads.wonAt), isNull(leads.lostAt)),
      )
  }

  async statsByAssignee(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<AssigneePeriodStats[]> {
    // Datas como texto ISO + cast: dentro de sql`` cru o driver não converte Date.
    const fromAt = sql`${from.toISOString()}::timestamptz`
    const toAt = sql`${to.toISOString()}::timestamptz`
    const createdInPeriod = sql`${funnels.kind} = 'SALES' and ${leads.createdAt} >= ${fromAt} and ${leads.createdAt} < ${toAt}`
    const wonInPeriod = sql`${funnels.isDefault} and ${leads.wonAt} >= ${fromAt} and ${leads.wonAt} < ${toAt}`
    const rows = await this.db
      .select({
        assignedUserId: leads.assignedUserId,
        created: sql<number>`count(*) filter (where ${createdInPeriod})`.mapWith(Number),
        wonOfCreated:
          sql<number>`count(*) filter (where ${createdInPeriod} and ${leads.wonAt} is not null)`.mapWith(
            Number,
          ),
        wonCount: sql<number>`count(*) filter (where ${wonInPeriod})`.mapWith(Number),
        wonValueCents:
          sql<number>`coalesce(sum(${leads.valueCents}) filter (where ${wonInPeriod}), 0)`.mapWith(
            Number,
          ),
      })
      .from(leads)
      .innerJoin(funnels, eq(funnels.id, leads.funnelId))
      .where(eq(leads.organizationId, organizationId))
      .groupBy(leads.assignedUserId)
    return rows
  }

  async countPendingQueueOffers(organizationId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(leadOffers)
      .where(and(eq(leadOffers.organizationId, organizationId), eq(leadOffers.status, 'pending')))
    return row?.value ?? 0
  }

  async wonInFunnelByAssignee(
    funnelId: string,
  ): Promise<{ assignedUserId: string | null; count: number }[]> {
    return this.db
      .select({ assignedUserId: leads.assignedUserId, count: count() })
      .from(leads)
      .where(and(eq(leads.funnelId, funnelId), isNotNull(leads.wonAt)))
      .groupBy(leads.assignedUserId)
  }
}
