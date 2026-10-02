// GetActivityRankingUseCase — "corrida" de ligações e visitas: quem mais fez
// no período (semana ou mês), aberto a qualquer papel na tela do ranking.
//
// Conta as tarefas de Ligação e de Visita CONCLUÍDAS no período (pela data
// de conclusão, completedAt), atribuídas a cada Vendedor ativo — tanto as
// registradas na hora ("Ligação feita" / "Visita feita") quanto as agendadas
// que foram concluídas depois.
// Ordem: total; empate → mais visitas → mais ligações → maior ofensiva → nome.

import { Role } from '@sylocrm/domain'
import type { MemberTier } from '@sylocrm/domain'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { IStreakRepository } from '../ports/streak.repository'
import type { ITaskRepository } from '../ports/task.repository'
import type { UseCase } from '../ports/use-case'
import { currentMonthInBrasilia } from '../shared/current-month-in-brasilia'
import { currentWeekInBrasilia } from '../shared/current-week-in-brasilia'
import { computeStreak } from './get-my-streak.use-case'
import type { SalesRankingPeriod } from './get-sales-ranking.use-case'

export interface GetActivityRankingInput {
  organizationId: string
  /** Padrão: semana — é a "corrida da semana". */
  period?: SalesRankingPeriod
  now?: Date
}

export interface ActivityRankingEntry {
  userId: string
  name: string
  avatarUrl: string | null
  tier: MemberTier
  calls: number
  visits: number
  total: number
  streakDays: number
}

export interface ActivityRanking {
  period: SalesRankingPeriod
  periodStart: Date
  periodEnd: Date
  /** Já na ordem do ranking (1º primeiro). */
  sellers: ActivityRankingEntry[]
}

export class GetActivityRankingUseCase
  implements UseCase<GetActivityRankingInput, ActivityRanking>
{
  constructor(
    private readonly membershipRepository: IMembershipRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly streakRepository: IStreakRepository,
  ) {}

  async execute(input: GetActivityRankingInput): Promise<ActivityRanking> {
    const now = input.now ?? new Date()
    const period = input.period ?? 'week'
    const { start, end } =
      period === 'week' ? currentWeekInBrasilia(now) : currentMonthInBrasilia(now)

    const members = await this.membershipRepository.findActiveByOrganizationId(input.organizationId)
    const sellers = members.filter((m) => m.status === 'ACTIVE' && m.role === Role.SELLER)

    const entries = await Promise.all(
      sellers.map(async (member): Promise<ActivityRankingEntry> => {
        const done = {
          organizationId: input.organizationId,
          assignedUserId: member.userId,
          status: 'concluida' as const,
          completedFrom: start,
          completedTo: end,
        }
        const [calls, visits, activeDays] = await Promise.all([
          this.taskRepository.count({ ...done, type: 'Ligação' }),
          this.taskRepository.count({ ...done, type: 'Visita' }),
          this.streakRepository.listActiveDays(member.userId),
        ])
        return {
          userId: member.userId,
          name: member.name?.trim() || member.email,
          avatarUrl: member.avatarUrl,
          tier: member.tier,
          calls,
          visits,
          total: calls + visits,
          streakDays: computeStreak(activeDays, now).current,
        }
      }),
    )

    entries.sort(
      (a, b) =>
        b.total - a.total ||
        b.visits - a.visits ||
        b.calls - a.calls ||
        b.streakDays - a.streakDays ||
        a.name.localeCompare(b.name, 'pt-BR'),
    )

    return { period, periodStart: start, periodEnd: end, sellers: entries }
  }
}
