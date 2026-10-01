// DrizzleActivityLogRepository — implementação concreta de IActivityLogRepository.
//
// A listagem faz LEFT JOIN em users pra trazer quem fez a ação (null quando
// foi automática). Paginação server-side, mais recentes primeiro.

import type {
  ActivityAction,
  ActivityEntityType,
  ActivityListFilter,
  ActivityListPage,
  ActivityMetadata,
  IActivityLogRepository,
  NewActivityEntry,
} from '@sylocrm/application'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../client'
import { activityLog, users } from '../schema'

export class DrizzleActivityLogRepository implements IActivityLogRepository {
  constructor(private readonly db: Database) {}

  async record(entry: NewActivityEntry): Promise<void> {
    await this.db.insert(activityLog).values({
      organizationId: entry.organizationId,
      actorUserId: entry.actorUserId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityLabel: entry.entityLabel,
      metadata: entry.metadata ?? {},
    })
  }

  async list(
    filter: ActivityListFilter,
    page: number,
    pageSize: number,
  ): Promise<ActivityListPage> {
    const conditions = [eq(activityLog.organizationId, filter.organizationId)]
    if (filter.entityType) conditions.push(eq(activityLog.entityType, filter.entityType))
    if (filter.entityId) conditions.push(eq(activityLog.entityId, filter.entityId))
    if (filter.actions?.length) conditions.push(inArray(activityLog.action, filter.actions))
    const where = and(...conditions)

    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          id: activityLog.id,
          organizationId: activityLog.organizationId,
          action: activityLog.action,
          entityType: activityLog.entityType,
          entityId: activityLog.entityId,
          entityLabel: activityLog.entityLabel,
          metadata: activityLog.metadata,
          createdAt: activityLog.createdAt,
          actorId: users.id,
          actorName: users.name,
          actorEmail: users.email,
          actorAvatarUrl: users.avatarUrl,
        })
        .from(activityLog)
        .leftJoin(users, eq(activityLog.actorUserId, users.id))
        .where(where)
        .orderBy(desc(activityLog.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db.select({ count: sql<number>`count(*)::int` }).from(activityLog).where(where),
    ])

    return {
      items: rows.map((row) => ({
        id: row.id,
        organizationId: row.organizationId,
        actor:
          row.actorId && row.actorEmail
            ? {
                id: row.actorId,
                name: row.actorName,
                email: row.actorEmail,
                avatarUrl: row.actorAvatarUrl,
              }
            : null,
        action: row.action as ActivityAction,
        entityType: row.entityType as ActivityEntityType,
        entityId: row.entityId,
        entityLabel: row.entityLabel,
        metadata: (row.metadata as ActivityMetadata | null) ?? {},
        createdAt: row.createdAt,
      })),
      total: countRows[0]?.count ?? 0,
      page,
      pageSize,
    }
  }
}
