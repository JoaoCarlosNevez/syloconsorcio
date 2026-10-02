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
    const day = sql<string>`to_char((${activityLog.createdAt} AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD')`
    const rows = await this.db
      .selectDistinct({ day })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.actorUserId, userId),
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
      .orderBy(day)
    return rows.map((row) => row.day)
  }
}
