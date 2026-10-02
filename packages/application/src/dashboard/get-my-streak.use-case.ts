// GetMyStreakUseCase — ofensiva do Perfil, estilo Duolingo: quantos dias
// seguidos o usuário trabalhou no CRM.
//
// Um dia conta quando o usuário fez alguma ação de trabalho (ver
// STREAK_ACTIONS) — mover lead de etapa, concluir/registrar tarefa (ligação,
// visita…), ganhar lead, gerar proposta, comentar. Dias no horário de
// Brasília.
//
// A ofensiva de ontem continua valendo durante o dia de hoje (ainda dá pra
// manter): só zera quando um dia inteiro passa sem atividade.

import type { IStreakRepository } from '../ports/streak.repository'
import type { UseCase } from '../ports/use-case'

/** Ações do log que contam pra ofensiva. 'task.created' só conta quando a
 * tarefa nasce concluída ("Registrar agora: Ligação/Visita feita"). */
export const STREAK_ACTIONS = [
  'lead.stage_changed',
  'lead.won',
  'lead.proposal_created',
  'lead.comment_added',
  'task.completed',
] as const

export type StreakDayStatus = 'done' | 'missed' | 'today' | 'future'

export interface MyStreak {
  /** Dias seguidos até hoje (ou até ontem, se hoje ainda não teve atividade). */
  current: number
  /** Maior sequência já feita. */
  record: number
  todayDone: boolean
  /** Semana atual, segunda a domingo. 'today' = hoje ainda sem atividade. */
  week: { date: string; status: StreakDayStatus }[]
}

const DAY_MS = 24 * 60 * 60 * 1000

/** "YYYY-MM-DD" do dia em Brasília. */
export function brasiliaDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function keyToUtc(key: string): number {
  const [year, month, day] = key.split('-').map(Number)
  return Date.UTC(year as number, (month as number) - 1, day as number)
}

function addDays(key: string, days: number): string {
  return new Date(keyToUtc(key) + days * DAY_MS).toISOString().slice(0, 10)
}

/** Sequência que termina em `lastDay` (inclusive). */
function runEndingAt(active: ReadonlySet<string>, lastDay: string): number {
  let count = 0
  let day = lastDay
  while (active.has(day)) {
    count++
    day = addDays(day, -1)
  }
  return count
}

export function computeStreak(activeDays: string[], now: Date): MyStreak {
  const active = new Set(activeDays)
  const today = brasiliaDateKey(now)
  const todayDone = active.has(today)
  const current = todayDone ? runEndingAt(active, today) : runEndingAt(active, addDays(today, -1))

  let record = 0
  let run = 0
  let previous: string | null = null
  for (const day of [...active].sort()) {
    run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1
    record = Math.max(record, run)
    previous = day
  }

  // Segunda-feira da semana de hoje (getUTCDay: 0 = domingo).
  const weekday = new Date(keyToUtc(today)).getUTCDay()
  const monday = addDays(today, -((weekday + 6) % 7))
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i)
    const status: StreakDayStatus = active.has(date)
      ? 'done'
      : date === today
        ? 'today'
        : date > today
          ? 'future'
          : 'missed'
    return { date, status }
  })

  return { current, record, todayDone, week }
}

export class GetMyStreakUseCase implements UseCase<{ userId: string; now?: Date }, MyStreak> {
  constructor(private readonly streakRepository: IStreakRepository) {}

  async execute(input: { userId: string; now?: Date }): Promise<MyStreak> {
    const days = await this.streakRepository.listActiveDays(input.userId)
    return computeStreak(days, input.now ?? new Date())
  }
}
