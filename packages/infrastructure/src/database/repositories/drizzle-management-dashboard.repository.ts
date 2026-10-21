// DrizzleManagementDashboardRepository — leituras do painel de gestão (ver
// IManagementDashboardRepository). Só seleciona colunas; as contas ficam no
// GetManagementDashboardUseCase.

import type { IManagementDashboardRepository, OpenLeadSnapshot } from '@sylocrm/application'
import { and, count, eq, gte, isNotNull, isNull, lt } from 'drizzle-orm'
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

  async countCreatedInSalesFunnels(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<{ created: number; wonOfCreated: number }> {
    const conditions = [
      eq(leads.organizationId, organizationId),
      eq(funnels.kind, 'SALES'),
      gte(leads.createdAt, from),
      lt(leads.createdAt, to),
    ]
    const [createdRow] = await this.db
      .select({ value: count() })
      .from(leads)
      .innerJoin(funnels, eq(funnels.id, leads.funnelId))
      .where(and(...conditions))
    const [wonRow] = await this.db
      .select({ value: count() })
      .from(leads)
      .innerJoin(funnels, eq(funnels.id, leads.funnelId))
      .where(and(...conditions, isNotNull(leads.wonAt)))
    return { created: createdRow?.value ?? 0, wonOfCreated: wonRow?.value ?? 0 }
  }

  async countPendingQueueOffers(organizationId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(leadOffers)
      .where(and(eq(leadOffers.organizationId, organizationId), eq(leadOffers.status, 'pending')))
    return row?.value ?? 0
  }

  async countWonInFunnel(funnelId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(leads)
      .where(and(eq(leads.funnelId, funnelId), isNotNull(leads.wonAt)))
    return row?.value ?? 0
  }
}
