// DrizzleNotificationRepository — implementação concreta de
// INotificationRepository.
//
// Os lembretes ("vence em breve", "atrasada") são gerados com um único
// INSERT ... SELECT ... ON CONFLICT DO NOTHING sobre as tarefas abertas do
// usuário — a chave de dedupe (tipo + tarefa + prazo) garante um lembrete por
// prazo, mesmo com o sininho consultando a cada minuto.
//
// A listagem traz as não lidas primeiro e faz LEFT JOIN em users (quem causou) e em tasks (estado atual da
// tarefa, pra abrir direto no clique). Lembretes de tarefa já concluída ou que
// passou pra outra pessoa são filtrados — deixaram de ser verdade.

import type {
  INotificationRepository,
  NewNotification,
  NotificationList,
  NotificationMetadata,
  NotificationRecipient,
  NotificationTask,
  NotificationType,
  TaskReminderOptions,
} from '@sylocrm/application'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import type { Database } from '../client'
import { notifications, tasks, users } from '../schema'

const REMINDER_TYPES: NotificationType[] = ['task.due_soon', 'task.overdue']

function recipientConditions(recipient: NotificationRecipient) {
  return [
    eq(notifications.userId, recipient.userId),
    eq(notifications.organizationId, recipient.organizationId),
  ]
}

/** Lembrete só vale enquanto a tarefa está aberta e é do usuário. */
function stillRelevant(recipient: NotificationRecipient) {
  return sql`(${notifications.type} NOT IN (${sql.join(
    REMINDER_TYPES.map((type) => sql`${type}`),
    sql`, `,
  )}) OR (${tasks.status} <> 'concluida' AND ${tasks.assignedUserId} = ${recipient.userId}))`
}

export class DrizzleNotificationRepository implements INotificationRepository {
  constructor(private readonly db: Database) {}

  async notify(notification: NewNotification): Promise<void> {
    await this.db.insert(notifications).values({
      organizationId: notification.organizationId,
      userId: notification.userId,
      actorUserId: notification.actorUserId,
      type: notification.type,
      taskId: notification.taskId,
      title: notification.title,
      metadata: notification.metadata ?? {},
    })
  }

  async syncTaskReminders(
    recipient: NotificationRecipient,
    options: TaskReminderOptions,
  ): Promise<void> {
    const now = options.now.toISOString()
    const dueSoonLimit = new Date(options.now.getTime() + options.dueSoonWindowMs).toISOString()

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
      WHERE t.assigned_user_id = ${recipient.userId}
        AND t.organization_id = ${recipient.organizationId}
        AND t.status <> 'concluida'
        AND t.due_at < ${dueSoonLimit}::timestamptz
      ON CONFLICT (user_id, dedupe_key) DO NOTHING
    `)
  }

  async list(recipient: NotificationRecipient, limit: number): Promise<NotificationList> {
    const where = and(...recipientConditions(recipient), stillRelevant(recipient))

    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          id: notifications.id,
          organizationId: notifications.organizationId,
          type: notifications.type,
          title: notifications.title,
          metadata: notifications.metadata,
          readAt: notifications.readAt,
          createdAt: notifications.createdAt,
          actorId: users.id,
          actorName: users.name,
          actorEmail: users.email,
          actorAvatarUrl: users.avatarUrl,
          task: {
            id: tasks.id,
            organizationId: tasks.organizationId,
            leadId: tasks.leadId,
            assignedUserId: tasks.assignedUserId,
            createdByUserId: tasks.createdByUserId,
            type: tasks.type,
            title: tasks.title,
            notes: tasks.notes,
            status: tasks.status,
            dueAt: tasks.dueAt,
            createdAt: tasks.createdAt,
            updatedAt: tasks.updatedAt,
          },
        })
        .from(notifications)
        .leftJoin(users, eq(notifications.actorUserId, users.id))
        .leftJoin(tasks, eq(notifications.taskId, tasks.id))
        .where(where)
        // Não lidas primeiro — senão uma não lida antiga some da lista atrás
        // das já vistas mais recentes.
        .orderBy(sql`${notifications.readAt} IS NULL DESC`, desc(notifications.createdAt))
        .limit(limit),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .leftJoin(tasks, eq(notifications.taskId, tasks.id))
        .where(and(where, isNull(notifications.readAt))),
    ])

    return {
      items: rows.map((row) => {
        const task = row.task
        const visibleTask =
          task &&
          (task.assignedUserId === recipient.userId || task.createdByUserId === recipient.userId)
            ? ({ ...task, status: task.status as NotificationTask['status'] } as NotificationTask)
            : null
        return {
          id: row.id,
          organizationId: row.organizationId,
          type: row.type as NotificationType,
          actor:
            row.actorId && row.actorEmail
              ? {
                  id: row.actorId,
                  name: row.actorName,
                  email: row.actorEmail,
                  avatarUrl: row.actorAvatarUrl,
                }
              : null,
          title: row.title,
          metadata: (row.metadata as NotificationMetadata | null) ?? {},
          task: visibleTask,
          readAt: row.readAt,
          createdAt: row.createdAt,
        }
      }),
      unreadCount: countRows[0]?.count ?? 0,
    }
  }

  async markRead(id: string, recipient: NotificationRecipient): Promise<boolean> {
    const rows = await this.db
      .update(notifications)
      .set({ readAt: sql`coalesce(${notifications.readAt}, now())` })
      .where(and(eq(notifications.id, id), ...recipientConditions(recipient)))
      .returning({ id: notifications.id })
    return rows.length > 0
  }

  async markAllRead(recipient: NotificationRecipient): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: sql`now()` })
      .where(and(...recipientConditions(recipient), isNull(notifications.readAt)))
  }
}
