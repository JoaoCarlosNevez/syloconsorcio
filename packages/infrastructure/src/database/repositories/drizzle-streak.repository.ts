// DrizzleStreakRepository — implementação concreta de IStreakRepository.
//
// Lê os dias com atividade direto do activity_log (ADR-02: Drizzle). O dia é
// calculado no horário de Brasília, igual ao resto do app.

import { type IStreakRepository, STREAK_ACTIONS } from '@sylocrm/application'
import { and, eq, inArray, or, sql } from 'drizzle-orm'
import type { Database } from '../client'
import { activityLog } from '../schema'

export class DrizzleStreakRepository implements IStreakRepository {
  constructor(private readonly db: Database) {}

  async listActiveDays(userId: string): Promise<string[]> {
    return (await this.listActiveDaysByUser([userId])).get(userId) ?? []
  }

  async listActiveDaysByUser(userIds: string[]): Promise<Map<string, string[]>> {
    const days = new Map<string, string[]>()
    if (userIds.length === 0) return days

    const day = sql<string>`to_char((${activityLog.createdAt} AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD')`
    const rows = await this.db
      .selectDistinct({ userId: activityLog.actorUserId, day })
      .from(activityLog)
      .where(
        and(
          inArray(activityLog.actorUserId, userIds),
          or(
            inArray(activityLog.action, [...STREAK_ACTIONS]),
            // Tarefa registrada já concluída ("Ligação feita", "Visita feita").
            and(
              eq(activityLog.action, 'task.created'),
              sql`${activityLog.metadata}->>'status' = 'concluida'`,
            ),
          ),
        ),
      )
      .orderBy(activityLog.actorUserId, day)

    for (const row of rows) {
      if (!row.userId) continue
      const list = days.get(row.userId) ?? []
      list.push(row.day)
      days.set(row.userId, list)
    }
    return days
  }
}
