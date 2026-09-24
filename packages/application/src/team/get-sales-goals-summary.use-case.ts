// GetSalesGoalsSummaryUseCase — progresso do mês das metas de vendas, pros
// cards "Meta Pessoal do Mês" e "Meta da Representação" do início.
//
// - Pessoal: meta do próprio usuário na organização (definida em
//   Configurações → Equipe) × soma dos leads dele marcados como Ganho no mês.
// - Representação: soma das metas dos membros ativos × soma de todos os leads
//   Ganhos da organização no mês — visível a qualquer papel, mesmo o Vendedor
//   que não enxerga os leads dos colegas (só o total agregado é exposto).
//
// "Mês" é o mês civil corrente no fuso de Brasília.

import type { ILeadRepository } from '../ports/lead.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { UseCase } from '../ports/use-case'

export interface GetSalesGoalsSummaryInput {
  organizationId: string
  userId: string
  /** Injetável pra testes; padrão = agora. */
  now?: Date
}

export interface SalesGoalProgress {
  /** Centavos de crédito; null quando não há meta definida. */
  goalCents: number | null
  achievedCents: number
}

export interface SalesGoalsSummary {
  periodStart: Date
  periodEnd: Date
  personal: SalesGoalProgress
  organization: SalesGoalProgress
}

// Brasília é UTC-3 fixo desde o fim do horário de verão (2019).
const BRASILIA_UTC_OFFSET_HOURS = 3

function currentMonthInBrasilia(now: Date): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now)
  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value) - 1
  return {
    start: new Date(Date.UTC(year, month, 1, BRASILIA_UTC_OFFSET_HOURS)),
    end: new Date(Date.UTC(year, month + 1, 1, BRASILIA_UTC_OFFSET_HOURS)),
  }
}

export class GetSalesGoalsSummaryUseCase
  implements UseCase<GetSalesGoalsSummaryInput, SalesGoalsSummary>
{
  constructor(
    private readonly membershipRepository: IMembershipRepository,
    private readonly leadRepository: ILeadRepository,
  ) {}

  async execute(input: GetSalesGoalsSummaryInput): Promise<SalesGoalsSummary> {
    const { start, end } = currentMonthInBrasilia(input.now ?? new Date())

    const [members, personalAchieved, organizationAchieved] = await Promise.all([
      this.membershipRepository.findActiveByOrganizationId(input.organizationId),
      this.leadRepository.sumWonValueCents({
        organizationId: input.organizationId,
        assignedUserId: input.userId,
        wonFrom: start,
        wonTo: end,
      }),
      this.leadRepository.sumWonValueCents({
        organizationId: input.organizationId,
        wonFrom: start,
        wonTo: end,
      }),
    ])

    const memberGoals = members
      .map((m) => m.salesGoalCents)
      .filter((goal): goal is number => goal !== null)
    const personalGoal = members.find((m) => m.userId === input.userId)?.salesGoalCents ?? null

    return {
      periodStart: start,
      periodEnd: end,
      personal: { goalCents: personalGoal, achievedCents: personalAchieved },
      organization: {
        goalCents: memberGoals.length > 0 ? memberGoals.reduce((sum, g) => sum + g, 0) : null,
        achievedCents: organizationAchieved,
      },
    }
  }
}
