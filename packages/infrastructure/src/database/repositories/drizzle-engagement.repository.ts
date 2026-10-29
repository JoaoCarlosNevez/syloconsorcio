// DrizzleEngagementRepository — números do "Engajamento operacional" do
// Perfil (ver IEngagementRepository).

import type {
  BackofficeWorkCounts,
  EngagementRange,
  IEngagementRepository,
} from '@sylocrm/application'
import { and, countDistinct, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import type { Database } from '../client'
import { activityLog, funnels, leadChecklistItems, leadProposals, leads } from '../schema'

/** Ações que contam como "atender" um lead. */
const WORK_ACTIONS = [
  'lead.created',
  'lead.updated',
  'lead.stage_changed',
  'lead.won',
  'lead.lost',
  'lead.comment_added',
  'lead.proposal_created',
  'lead.adhesion_updated',
  'lead.document_uploaded',
]

export class DrizzleEngagementRepository implements IEngagementRepository {
  constructor(private readonly db: Database) {}

  async countLeadsWorked(range: EngagementRange): Promise<number> {
    const [row] = await this.db
      .select({ value: countDistinct(activityLog.entityId) })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.organizationId, range.organizationId),
          eq(activityLog.actorUserId, range.userId),
          eq(activityLog.entityType, 'lead'),
          inArray(activityLog.action, WORK_ACTIONS),
          gte(activityLog.createdAt, range.from),
          lt(activityLog.createdAt, range.to),
        ),
      )
    return row?.value ?? 0
  }

  async proposalStats(
    range: EngagementRange,
  ): Promise<{ created: number; shared: number; opened: number }> {
    const [row] = await this.db
      .select({
        created: sql<number>`count(*)`.mapWith(Number),
        shared:
          sql<number>`count(*) filter (where ${leadProposals.shareToken} is not null)`.mapWith(
            Number,
          ),
        opened: sql<number>`count(*) filter (where ${leadProposals.viewCount} > 0)`.mapWith(Number),
      })
      .from(leadProposals)
      .innerJoin(leads, eq(leads.id, leadProposals.leadId))
      .where(
        and(
          eq(leads.organizationId, range.organizationId),
          eq(leadProposals.createdByUserId, range.userId),
          gte(leadProposals.createdAt, range.from),
          lt(leadProposals.createdAt, range.to),
        ),
      )
    return { created: row?.created ?? 0, shared: row?.shared ?? 0, opened: row?.opened ?? 0 }
  }

  async backofficeWork(range: EngagementRange): Promise<BackofficeWorkCounts> {
    const mine = and(
      eq(activityLog.organizationId, range.organizationId),
      eq(activityLog.actorUserId, range.userId),
      gte(activityLog.createdAt, range.from),
      lt(activityLog.createdAt, range.to),
    )
    // Reenviar o mesmo documento ou responder de novo o mesmo mês não conta duas vezes.
    const documentKey = sql`${activityLog.entityId}::text || ':' || coalesce(${activityLog.metadata}->>'kind', '')`
    const monthKey = sql`${activityLog.entityId}::text || ':' || coalesce(${activityLog.metadata}->>'month', '')`

    const [actions, effective, checklist] = await Promise.all([
      this.db
        .select({
          documents:
            sql<number>`count(distinct ${documentKey}) filter (where ${activityLog.action} = 'lead.document_uploaded')`.mapWith(
              Number,
            ),
          paid: sql<number>`count(distinct ${monthKey}) filter (where ${activityLog.action} = 'lead.installment_paid')`.mapWith(
            Number,
          ),
          late: sql<number>`count(distinct ${monthKey}) filter (where ${activityLog.action} = 'lead.installment_late')`.mapWith(
            Number,
          ),
          tasks:
            sql<number>`count(distinct ${activityLog.entityId}) filter (where ${activityLog.action} = 'task.completed')`.mapWith(
              Number,
            ),
        })
        .from(activityLog)
        .where(
          and(
            mine,
            inArray(activityLog.action, [
              'lead.document_uploaded',
              'lead.installment_paid',
              'lead.installment_late',
              'task.completed',
            ]),
          ),
        ),
      this.db
        .select({ value: countDistinct(activityLog.entityId) })
        .from(activityLog)
        .innerJoin(leads, eq(leads.id, activityLog.entityId))
        .innerJoin(funnels, eq(funnels.id, leads.funnelId))
        .where(and(mine, eq(activityLog.action, 'lead.won'), eq(funnels.kind, 'BACKOFFICE'))),
      this.db
        .select({ value: sql<number>`count(*)`.mapWith(Number) })
        .from(leadChecklistItems)
        .innerJoin(leads, eq(leads.id, leadChecklistItems.leadId))
        .where(
          and(
            eq(leads.organizationId, range.organizationId),
            eq(leadChecklistItems.checkedByUserId, range.userId),
            gte(leadChecklistItems.checkedAt, range.from),
            lt(leadChecklistItems.checkedAt, range.to),
          ),
        ),
    ])
    const row = actions[0]
    return {
      quotasEffective: effective[0]?.value ?? 0,
      checklistItems: checklist[0]?.value ?? 0,
      documents: row?.documents ?? 0,
      paymentsPaid: row?.paid ?? 0,
      paymentsLate: row?.late ?? 0,
      tasksCompleted: row?.tasks ?? 0,
    }
  }
}
