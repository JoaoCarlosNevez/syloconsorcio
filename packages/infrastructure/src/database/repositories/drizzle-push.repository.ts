// Repositórios do Web Push — aparelhos inscritos (push_subscriptions) e a
// fila de envio (notifications.pushed_at).
//
// A fila é a própria tabela de notificações: toda notificação nasce com
// pushed_at null, venha de onde vier (tarefa, fila de leads, webhook,
// proposta aberta). claimPending marca e devolve num único UPDATE ...
// RETURNING com FOR UPDATE SKIP LOCKED — duas instâncias da API nunca mandam
// o mesmo push.

import type {
  IPushOutboxRepository,
  IPushSubscriptionRepository,
  NotificationMetadata,
  NotificationType,
  PendingPush,
  PushSubscriptionRecord,
} from '@sylocrm/application'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../client'
import { notifications, pushSubscriptions, tasks, users } from '../schema'

export class DrizzlePushSubscriptionRepository implements IPushSubscriptionRepository {
  constructor(private readonly db: Database) {}

  async save(input: PushSubscriptionRecord & { userAgent: string | null }): Promise<void> {
    await this.db
      .insert(pushSubscriptions)
      .values({
        userId: input.userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: input.userId,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          userAgent: input.userAgent,
          updatedAt: new Date(),
        },
      })
  }

  async remove(userId: string, endpoint: string): Promise<void> {
    await this.db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
  }

  async removeByEndpoint(endpoint: string): Promise<void> {
    await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
  }

  async listByUserIds(userIds: readonly string[]): Promise<PushSubscriptionRecord[]> {
    if (userIds.length === 0) return []
    const rows = await this.db
      .select({
        userId: pushSubscriptions.userId,
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
      })
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, [...userIds]))
    return rows.map((row) => ({
      userId: row.userId,
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    }))
  }
}

interface ClaimedRow extends Record<string, unknown> {
  id: string
  user_id: string
  organization_id: string
  type: string
  title: string
  metadata: unknown
  task_id: string | null
  created_at: string | Date
  actor_name: string | null
  actor_email: string | null
  preferences: unknown
}

export class DrizzlePushOutboxRepository implements IPushOutboxRepository {
  constructor(private readonly db: Database) {}

  async syncAllTaskReminders(options: { now: Date; dueSoonWindowMs: number }): Promise<void> {
    const now = options.now.toISOString()
    const dueSoonLimit = new Date(options.now.getTime() + options.dueSoonWindowMs).toISOString()

    // Mesmo INSERT do sininho (DrizzleNotificationRepository.syncTaskReminders),
    // sem o filtro por usuário — a chave de dedupe é a mesma, então quem roda
    // primeiro cria e o outro não duplica.
    await this.db.execute(sql`
      INSERT INTO ${notifications}
        (organization_id, user_id, type, task_id, title, metadata, dedupe_key)
      SELECT
        t.organization_id,
        t.assigned_user_id,
        r.type,
        t.id,
        t.title,
        jsonb_build_object('taskType', t.type, 'dueAt', t.due_at),
        r.type || ':' || t.id || ':' || floor(extract(epoch FROM t.due_at))::bigint
      FROM ${tasks} t
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN t.due_at < ${now}::timestamptz THEN 'task.overdue'
          ELSE 'task.due_soon'
        END AS type
      ) r
      WHERE t.status <> 'concluida'
        AND t.due_at < ${dueSoonLimit}::timestamptz
      ON CONFLICT (user_id, dedupe_key) DO NOTHING
    `)
  }

  async claimPending(options: { since: Date; limit: number }): Promise<PendingPush[]> {
    const rows = await this.db.execute<ClaimedRow>(sql`
      WITH claimed AS (
        UPDATE ${notifications} n
        SET pushed_at = now()
        WHERE n.id IN (
          SELECT id FROM ${notifications}
          WHERE pushed_at IS NULL
          ORDER BY created_at
          LIMIT ${options.limit}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING n.id, n.user_id, n.organization_id, n.type, n.title, n.metadata,
          n.task_id, n.created_at, n.actor_user_id
      )
      SELECT c.id, c.user_id, c.organization_id, c.type, c.title, c.metadata, c.task_id,
        c.created_at, a.name AS actor_name, a.email AS actor_email,
        u.notification_preferences AS preferences
      FROM claimed c
      JOIN ${users} u ON u.id = c.user_id
      LEFT JOIN ${users} a ON a.id = c.actor_user_id
      WHERE c.created_at >= ${options.since.toISOString()}::timestamptz
      ORDER BY c.created_at
    `)
    return [...rows].map((row) => ({
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      type: row.type as NotificationType,
      title: row.title,
      metadata: (row.metadata ?? {}) as NotificationMetadata,
      taskId: row.task_id,
      actorName: row.actor_name?.trim() || row.actor_email,
      createdAt: new Date(row.created_at),
      preferences: row.preferences,
    }))
  }
}
