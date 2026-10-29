// DrizzleAchievementsRepository — dados do Mural de Conquistas (ver
// IAchievementsRepository).

import type { AchievementsScope, IAchievementsRepository } from '@sylocrm/application'
import { and, asc, eq, inArray, isNotNull, min, sql } from 'drizzle-orm'
import type { Database } from '../client'
import { activityLog, funnels, leadChecklistItems, leads } from '../schema'

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

  async firstChecklistItemAt(scope: AchievementsScope, itemKeys: string[]): Promise<Date | null> {
    const [row] = await this.db
      .select({ at: min(leadChecklistItems.checkedAt) })
      .from(leadChecklistItems)
      .innerJoin(leads, eq(leads.id, leadChecklistItems.leadId))
      .where(
        and(
          eq(leads.organizationId, scope.organizationId),
          eq(leads.assignedUserId, scope.userId),
          inArray(leadChecklistItems.itemKey, itemKeys),
        ),
      )
    return row?.at ?? null
  }

  async listEffectiveQuotaDates(scope: AchievementsScope): Promise<Date[]> {
    // Ganho no funil ADM marcado pelo usuário — a primeira vez de cada cota.
    const effectiveAt = min(activityLog.createdAt)
    const rows = await this.db
      .select({ at: effectiveAt })
      .from(activityLog)
      .innerJoin(leads, eq(leads.id, activityLog.entityId))
      .innerJoin(funnels, eq(funnels.id, leads.funnelId))
      .where(
        and(
          eq(activityLog.organizationId, scope.organizationId),
          eq(activityLog.actorUserId, scope.userId),
          eq(activityLog.action, 'lead.won'),
          eq(funnels.kind, 'BACKOFFICE'),
        ),
      )
      .groupBy(activityLog.entityId)
      .orderBy(asc(effectiveAt))
    return rows.flatMap((row) => (row.at ? [row.at] : []))
  }

  async listChecklistCheckDates(scope: AchievementsScope, itemKeys?: string[]): Promise<Date[]> {
    const rows = await this.db
      .select({ at: leadChecklistItems.checkedAt })
      .from(leadChecklistItems)
      .innerJoin(leads, eq(leads.id, leadChecklistItems.leadId))
      .where(
        and(
          eq(leads.organizationId, scope.organizationId),
          eq(leadChecklistItems.checkedByUserId, scope.userId),
          itemKeys ? inArray(leadChecklistItems.itemKey, itemKeys) : undefined,
        ),
      )
      .orderBy(asc(leadChecklistItems.checkedAt))
    return rows.map((row) => row.at)
  }

  async firstPaymentCheckAt(scope: AchievementsScope): Promise<Date | null> {
    const [row] = await this.db
      .select({ at: min(activityLog.createdAt) })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.organizationId, scope.organizationId),
          eq(activityLog.actorUserId, scope.userId),
          inArray(activityLog.action, ['lead.installment_paid', 'lead.installment_late']),
        ),
      )
    return row?.at ?? null
  }

  async firstPostSaleStageMoveAt(
    scope: AchievementsScope,
    stageNames: string[],
  ): Promise<Date | null> {
    const [row] = await this.db
      .select({ at: min(activityLog.createdAt) })
      .from(activityLog)
      .innerJoin(leads, eq(leads.id, activityLog.entityId))
      .innerJoin(funnels, eq(funnels.id, leads.funnelId))
      .where(
        and(
          eq(activityLog.organizationId, scope.organizationId),
          eq(activityLog.action, 'lead.stage_changed'),
          eq(activityLog.actorUserId, scope.userId),
          eq(funnels.kind, 'POST_SALE'),
          inArray(sql<string>`${activityLog.metadata}->>'toStage'`, stageNames),
        ),
      )
    return row?.at ?? null
  }
}
