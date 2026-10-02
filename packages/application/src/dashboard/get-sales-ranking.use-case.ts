// GetSalesRankingUseCase — ranking da semana ou do mês (pódio +
// classificação), aberto a qualquer papel a partir do início.
//
// Entram os Vendedores ativos da organização. Pra cada um: leads ganhos no
// período (quantidade e valor, funil padrão — mesmo recorte da "Meta da
// Representação"), a meta do mês definida pelo gestor (com o ganho do mês,
// que é o que a meta mede — mesmo no ranking da semana) e a ofensiva atual.
// Ordem: valor ganho; empate → mais clientes ganhos → maior ofensiva →
// nome.
//
// Também devolve a meta da operação (organização ou soma das metas dos
// membros, igual a GetSalesGoalsSummaryUseCase) e o total ganho no mês.

import { Role } from '@sylocrm/domain'
import type { MemberTier } from '@sylocrm/domain'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { IStreakRepository } from '../ports/streak.repository'
import type { UseCase } from '../ports/use-case'
import { currentMonthInBrasilia } from '../shared/current-month-in-brasilia'
import { currentWeekInBrasilia } from '../shared/current-week-in-brasilia'
import { computeStreak } from './get-my-streak.use-case'

export type SalesRankingPeriod = 'week' | 'month'

export interface GetSalesRankingInput {
  organizationId: string
  /** Padrão: mês. */
  period?: SalesRankingPeriod
  now?: Date
}

export interface SalesRankingEntry {
  userId: string
  name: string
  avatarUrl: string | null
  tier: MemberTier
  /** Ganhos no período escolhido. */
  wonCount: number
  wonCents: number
  /** Meta do mês definida pelo gestor; null = sem meta. */
  goalCents: number | null
  /** Ganho no mês — o progresso da meta usa este, em qualquer período. */
  monthWonCents: number
  streakDays: number
}

export interface SalesRanking {
  period: SalesRankingPeriod
  periodStart: Date
  periodEnd: Date
  /** Sempre o mês — a meta da operação é mensal. */
  organization: {
    name: string
    goalCents: number | null
    achievedCents: number
  }
  /** Já na ordem do ranking (1º primeiro). */
  sellers: SalesRankingEntry[]
}

export class GetSalesRankingUseCase implements UseCase<GetSalesRankingInput, SalesRanking> {
  constructor(
    private readonly membershipRepository: IMembershipRepository,
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly streakRepository: IStreakRepository,
  ) {}

  async execute(input: GetSalesRankingInput): Promise<SalesRanking> {
    const now = input.now ?? new Date()
    const period = input.period ?? 'month'
    const monthRange = currentMonthInBrasilia(now)
    const { start, end } = period === 'week' ? currentWeekInBrasilia(now) : monthRange
    const month = {
      organizationId: input.organizationId,
      wonFrom: monthRange.start,
      wonTo: monthRange.end,
    }
    const range = { organizationId: input.organizationId, wonFrom: start, wonTo: end }

    const [organization, members, achievedCents] = await Promise.all([
      this.organizationRepository.findById(input.organizationId),
      this.membershipRepository.findActiveByOrganizationId(input.organizationId),
      this.leadRepository.sumWonValueCentsInDefaultFunnel(month),
    ])

    const active = members.filter((m) => m.status === 'ACTIVE')
    const sellers = active.filter((m) => m.role === Role.SELLER)

    const entries = await Promise.all(
      sellers.map(async (member): Promise<SalesRankingEntry> => {
        const mine = { ...range, assignedUserId: member.userId }
        const [wonCents, wonCount, monthWonCents, activeDays] = await Promise.all([
          this.leadRepository.sumWonValueCentsInDefaultFunnel(mine),
          this.leadRepository.countWonInDefaultFunnel(mine),
          period === 'month'
            ? null
            : this.leadRepository.sumWonValueCentsInDefaultFunnel({
                ...month,
                assignedUserId: member.userId,
              }),
          this.streakRepository.listActiveDays(member.userId),
        ])
        return {
          userId: member.userId,
          name: member.name?.trim() || member.email,
          avatarUrl: member.avatarUrl,
          tier: member.tier,
          wonCount,
          wonCents,
          goalCents: member.salesGoalCents,
          monthWonCents: monthWonCents ?? wonCents,
          streakDays: computeStreak(activeDays, now).current,
        }
      }),
    )

    entries.sort(
      (a, b) =>
        b.wonCents - a.wonCents ||
        b.wonCount - a.wonCount ||
        b.streakDays - a.streakDays ||
        a.name.localeCompare(b.name, 'pt-BR'),
    )

    const memberGoals = active
      .map((m) => m.salesGoalCents)
      .filter((goal): goal is number => goal !== null)

    return {
      period,
      periodStart: start,
      periodEnd: end,
      organization: {
        name: organization?.name ?? '',
        goalCents:
          organization?.salesGoalCents ??
          (memberGoals.length > 0 ? memberGoals.reduce((sum, g) => sum + g, 0) : null),
        achievedCents,
      },
      sellers: entries,
    }
  }
}
