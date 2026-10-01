// ListMyLeadOffersUseCase — leads que a fila está oferecendo ao usuário
// agora (pendentes e no prazo), com o resumo que o vendedor precisa pra
// decidir. O lead ainda não é dele, então nada de telefone/e-mail aqui.

import type { ILeadQueueRepository } from '../ports/lead-queue.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { UseCase } from '../ports/use-case'

export interface ListMyLeadOffersInput {
  organizationId: string
  userId: string
  now: Date
}

export interface MyLeadOffer {
  id: string
  expiresAt: Date
  offeredAt: Date
  lead: {
    id: string
    funnelId: string
    name: string
    segment: string
    valueCents: number
    source: string
  }
}

export class ListMyLeadOffersUseCase implements UseCase<ListMyLeadOffersInput, MyLeadOffer[]> {
  constructor(
    private readonly leadQueueRepository: ILeadQueueRepository,
    private readonly leadRepository: ILeadRepository,
  ) {}

  async execute(input: ListMyLeadOffersInput): Promise<MyLeadOffer[]> {
    const offers = await this.leadQueueRepository.listPendingOffers({
      organizationId: input.organizationId,
      userId: input.userId,
      now: input.now,
    })
    const result: MyLeadOffer[] = []
    for (const offer of offers) {
      const lead = await this.leadRepository.findById(offer.leadId, {
        organizationIds: [offer.organizationId],
      })
      if (!lead) continue
      result.push({
        id: offer.id,
        expiresAt: offer.expiresAt,
        offeredAt: offer.offeredAt,
        lead: {
          id: lead.id,
          funnelId: lead.funnelId,
          name: lead.name,
          segment: lead.segment,
          valueCents: lead.valueCents,
          source: lead.source,
        },
      })
    }
    return result
  }
}
