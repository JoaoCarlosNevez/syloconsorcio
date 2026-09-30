// GetSalesGoalsSummaryUseCase — progresso do mês das metas de vendas, pros
// cards "Meta Pessoal do Mês" e "Meta da Representação" do início.
//
// - Pessoal: meta pessoal do usuário (definida por ele no Perfil) × soma dos
//   leads dele marcados como Ganho no mês. Também devolve a meta que o gestor
//   definiu pra ele na equipe (teamGoalCents), pra comparação.
// - Representação: meta da organização (Configurações → Organização) — ou,
//   se não definida, a soma das metas dos membros ativos — × soma de todos os leads
//   Ganhos da organização no mês — visível a qualquer papel, mesmo o Vendedor
//   que não enxerga os leads dos colegas (só o total agregado é exposto).
//
// Só contam leads ganhos no funil padrão (o comercial), pelo valor do
// crédito — ver ILeadRepository.sumWonValueCentsInDefaultFunnel.
// "Mês" é o mês civil corrente no fuso de Brasília.

import type { ILeadRepository } from '../ports/lead.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { currentMonthInBrasilia } from '../shared/current-month-in-brasilia'

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

export interface PersonalGoalProgress extends SalesGoalProgress {
  /** Meta que o gestor definiu pra este membro em Configurações → Equipe. */
  teamGoalCents: number | null
}

export interface SalesGoalsSummary {
  periodStart: Date
  periodEnd: Date
  personal: PersonalGoalProgress
  organization: SalesGoalProgress
}

export class GetSalesGoalsSummaryUseCase
  implements UseCase<GetSalesGoalsSummaryInput, SalesGoalsSummary>
{
  constructor(
    private readonly membershipRepository: IMembershipRepository,
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(input: GetSalesGoalsSummaryInput): Promise<SalesGoalsSummary> {
    const { start, end } = currentMonthInBrasilia(input.now ?? new Date())

    const [organization, members, personalGoal, personalAchieved, organizationAchieved] =
      await Promise.all([
        this.organizationRepository.findById(input.organizationId),
        this.membershipRepository.findActiveByOrganizationId(input.organizationId),
        this.membershipRepository.findPersonalGoal(input.userId, input.organizationId),
        this.leadRepository.sumWonValueCentsInDefaultFunnel({
          organizationId: input.organizationId,
          assignedUserId: input.userId,
          wonFrom: start,
          wonTo: end,
        }),
        this.leadRepository.sumWonValueCentsInDefaultFunnel({
          organizationId: input.organizationId,
          wonFrom: start,
          wonTo: end,
        }),
      ])

    const memberGoals = members
      .map((m) => m.salesGoalCents)
      .filter((goal): goal is number => goal !== null)
    const teamGoal = members.find((m) => m.userId === input.userId)?.salesGoalCents ?? null

    return {
      periodStart: start,
      periodEnd: end,
      personal: {
        goalCents: personalGoal,
        teamGoalCents: teamGoal,
        achievedCents: personalAchieved,
      },
      organization: {
        goalCents:
          organization?.salesGoalCents ??
          (memberGoals.length > 0 ? memberGoals.reduce((sum, g) => sum + g, 0) : null),
        achievedCents: organizationAchieved,
      },
    }
  }
}
