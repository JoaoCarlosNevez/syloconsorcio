// GetMyEngagementUseCase — "Engajamento operacional" do Perfil: o que o
// usuário fez nos últimos 30 dias (e nos 30 anteriores, pra comparar) na
// organização ativa. Qualquer papel — só olha os dados de quem está logado.
//
// - Leads atendidos: leads diferentes em que agiu (etapa, comentário,
//   proposta, ganho/perda, ficha de adesão — ver WORK_ACTIONS no repositório).
// - Simulações: propostas geradas; enviadas = com link compartilhado.
// - Propostas: as enviadas por link; abertas = o cliente abriu o link.
// - Cotas fechadas: leads dele ganhos no funil padrão (Comercial) — o mesmo
//   recorte das metas e do ranking.

import type { IEngagementRepository } from '../ports/engagement.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { UseCase } from '../ports/use-case'

export const ENGAGEMENT_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

export interface GetMyEngagementInput {
  organizationId: string
  userId: string
  now?: Date
}

export interface MyEngagement {
  periodStart: Date
  periodEnd: Date
  leadsWorked: number
  /** Mesma conta nos 30 dias anteriores. */
  leadsWorkedPrevious: number
  proposalsCreated: number
  proposalsShared: number
  proposalsOpened: number
  wonCount: number
  wonValueCents: number
}

export class GetMyEngagementUseCase implements UseCase<GetMyEngagementInput, MyEngagement> {
  constructor(
    private readonly engagementRepository: IEngagementRepository,
    private readonly leadRepository: ILeadRepository,
  ) {}

  async execute(input: GetMyEngagementInput): Promise<MyEngagement> {
    const to = input.now ?? new Date()
    const from = new Date(to.getTime() - ENGAGEMENT_DAYS * DAY_MS)
    const previousFrom = new Date(from.getTime() - ENGAGEMENT_DAYS * DAY_MS)
    const range = { organizationId: input.organizationId, userId: input.userId, from, to }
    const won = {
      organizationId: input.organizationId,
      assignedUserId: input.userId,
      wonFrom: from,
      wonTo: to,
    }

    const [leadsWorked, leadsWorkedPrevious, proposals, wonCount, wonValueCents] =
      await Promise.all([
        this.engagementRepository.countLeadsWorked(range),
        this.engagementRepository.countLeadsWorked({ ...range, from: previousFrom, to: from }),
        this.engagementRepository.proposalStats(range),
        this.leadRepository.countWonInDefaultFunnel(won),
        this.leadRepository.sumWonValueCentsInDefaultFunnel(won),
      ])

    return {
      periodStart: from,
      periodEnd: to,
      leadsWorked,
      leadsWorkedPrevious,
      proposalsCreated: proposals.created,
      proposalsShared: proposals.shared,
      proposalsOpened: proposals.opened,
      wonCount,
      wonValueCents,
    }
  }
}
