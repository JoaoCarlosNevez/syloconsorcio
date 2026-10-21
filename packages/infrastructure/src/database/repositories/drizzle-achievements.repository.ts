// DrizzleAchievementsRepository — dados do Mural de Conquistas (ver
// IAchievementsRepository).

import type { AchievementsScope, IAchievementsRepository } from '@sylocrm/application'
import { and, asc, eq, inArray, isNotNull, min, sql } from 'drizzle-orm'
import type { Database } from '../client'
import { activityLog, funnels, leads } from '../schema'

export class DrizzleAchievementsRepository implements IAchievementsRepository {
  constructor(private readonly db: Database) {}

  async listWonSales(scope: AchievementsScope): Promise<{ wonAt: Date; valueCents: number }[]> {
    const rows = await this.db
      .select({ wonAt: leads.wonAt, valueCents: leads.valueCents })
      .from(leads)
      .innerJoin(funnels, eq(funnels.id, leads.funnelId))
      .where(
        and(
          eq(leads.organizationId, scope.organizationId),
          eq(leads.assignedUserId, scope.userId),
          eq(funnels.isDefault, true),
          isNotNull(leads.wonAt),
        ),
      )
      .orderBy(asc(leads.wonAt))
    return rows.flatMap((row) =>
      row.wonAt ? [{ wonAt: row.wonAt, valueCents: row.valueCents }] : [],
    )
  }

  async firstPostSaleStageAt(scope: AchievementsScope, stageNames: string[]): Promise<Date | null> {
    // Mudanças de etapa no Pós-venda das cotas do usuário (lead atribuído a ele).
    const [row] = await this.db
      .select({ at: min(activityLog.createdAt) })
      .from(activityLog)
      .innerJoin(leads, eq(leads.id, activityLog.entityId))
      .innerJoin(funnels, eq(funnels.id, leads.funnelId))
      .where(
        and(
          eq(activityLog.organizationId, scope.organizationId),
          eq(activityLog.action, 'lead.stage_changed'),
          eq(leads.assignedUserId, scope.userId),
          eq(funnels.kind, 'POST_SALE'),
          inArray(sql<string>`${activityLog.metadata}->>'toStage'`, stageNames),
        ),
      )
    return row?.at ?? null
  }
}
