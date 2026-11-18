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

    // Uma consulta por métrica pra equipe toda (não uma por vendedor).
    const sellerIds = sellers.map((m) => m.userId)
    const [done, activeDays] = await Promise.all([
      this.taskRepository.countByAssigneeAndType({
        organizationId: input.organizationId,
        assignedUserIds: sellerIds,
        types: ['Ligação', 'Visita'],
        status: 'concluida',
        completedFrom: start,
        completedTo: end,
      }),
      this.streakRepository.listActiveDaysByUser(sellerIds),
    ])

    const entries = sellers.map((member): ActivityRankingEntry => {
      const byType = done.get(member.userId)
      const calls = byType?.get('Ligação') ?? 0
      const visits = byType?.get('Visita') ?? 0
      return {
        userId: member.userId,
        name: member.name?.trim() || member.email,
        avatarUrl: member.avatarUrl,
        tier: member.tier,
        calls,
        visits,
        total: calls + visits,
        streakDays: computeStreak(activeDays.get(member.userId) ?? [], now).current,
      }
    })

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
