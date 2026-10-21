// DrizzleEngagementRepository — números do "Engajamento operacional" do
// Perfil (ver IEngagementRepository).

import type { EngagementRange, IEngagementRepository } from '@sylocrm/application'
import { and, countDistinct, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import type { Database } from '../client'
import { activityLog, leadProposals, leads } from '../schema'

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
}
