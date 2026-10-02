// GetSalesRankingUseCase — ranking do mês (pódio + classificação), aberto a
// qualquer papel a partir do início.
//
// Entram os Vendedores ativos da organização. Pra cada um: leads ganhos no
// mês (quantidade e valor, funil padrão — mesmo recorte da "Meta da
// Representação"), a meta dele definida pelo gestor e a ofensiva atual.
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
import { computeStreak } from './get-my-streak.use-case'

export interface GetSalesRankingInput {
  organizationId: string
  now?: Date
}

export interface SalesRankingEntry {
  userId: string
  name: string
  avatarUrl: string | null
  tier: MemberTier
  wonCount: number
  wonCents: number
  /** Meta do mês definida pelo gestor; null = sem meta. */
  goalCents: number | null
  streakDays: number
}

export interface SalesRanking {
  periodStart: Date
  periodEnd: Date
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
    const { start, end } = currentMonthInBrasilia(now)
    const month = { organizationId: input.organizationId, wonFrom: start, wonTo: end }

    const [organization, members, achievedCents] = await Promise.all([
      this.organizationRepository.findById(input.organizationId),
      this.membershipRepository.findActiveByOrganizationId(input.organizationId),
      this.leadRepository.sumWonValueCentsInDefaultFunnel(month),
    ])

    const active = members.filter((m) => m.status === 'ACTIVE')
    const sellers = active.filter((m) => m.role === Role.SELLER)

    const entries = await Promise.all(
      sellers.map(async (member): Promise<SalesRankingEntry> => {
        const mine = { ...month, assignedUserId: member.userId }
        const [wonCents, wonCount, activeDays] = await Promise.all([
          this.leadRepository.sumWonValueCentsInDefaultFunnel(mine),
          this.leadRepository.countWonInDefaultFunnel(mine),
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
