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
//
// O Administrativo (BACKOFFICE) vê o trabalho dele: cotas efetivadas no ADM
// (vs 30 dias anteriores), itens de checklist, parcelas conferidas e tarefas
// concluídas (ver BackofficeWorkCounts).

import { Role } from '@sylocrm/domain'
import type { BackofficeWorkCounts, IEngagementRepository } from '../ports/engagement.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { UseCase } from '../ports/use-case'

export const ENGAGEMENT_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

export interface GetMyEngagementInput {
  organizationId: string
  userId: string
  /** Papel na organização ativa — o Administrativo vê o trabalho dele. */
  role?: Role
  now?: Date
}

export interface SellerEngagement {
  kind: 'seller'
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

export interface BackofficeEngagement extends BackofficeWorkCounts {
  kind: 'backoffice'
  periodStart: Date
  periodEnd: Date
  /** Cotas efetivadas nos 30 dias anteriores, pra comparar. */
  quotasEffectivePrevious: number
}

export type MyEngagement = SellerEngagement | BackofficeEngagement

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
    if (input.role === Role.BACKOFFICE) {
      const [work, previous] = await Promise.all([
        this.engagementRepository.backofficeWork(range),
        this.engagementRepository.backofficeWork({ ...range, from: previousFrom, to: from }),
      ])
      return {
        kind: 'backoffice',
        periodStart: from,
        periodEnd: to,
        ...work,
        quotasEffectivePrevious: previous.quotasEffective,
      }
    }

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
      kind: 'seller',
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
