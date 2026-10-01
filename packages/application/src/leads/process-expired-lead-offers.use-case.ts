// ProcessExpiredLeadOffersUseCase — passa adiante os leads cujas ofertas
// venceram sem resposta. Roda periodicamente na API (ver
// apps/api/src/workers/lead-offer-expiry.ts).
//
// Pra cada oferta vencida, o lead vai pro próximo da fila. Se não tiver mais
// ninguém (todo mundo já recebeu e deixou passar) ou a fila foi desligada no
// meio do caminho, Dono e Supervisores são avisados de que o lead ficou sem
// responsável.

import type { ILeadQueueRepository } from '../ports/lead-queue.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import { type INotificationRepository, NO_OP_NOTIFICATIONS } from '../ports/notification.repository'
import type { UseCase } from '../ports/use-case'
import { notifyLeadDistributors } from './notify-lead-distributors'
import type { OfferLeadToQueueUseCase } from './offer-lead-to-queue.use-case'

export interface ProcessExpiredLeadOffersInput {
  now: Date
}

export interface ProcessExpiredLeadOffersOutput {
  expired: number
}

export class ProcessExpiredLeadOffersUseCase
  implements UseCase<ProcessExpiredLeadOffersInput, ProcessExpiredLeadOffersOutput>
{
  constructor(
    private readonly leadQueueRepository: ILeadQueueRepository,
    private readonly offerLeadToQueue: OfferLeadToQueueUseCase,
    private readonly membershipRepository: IMembershipRepository,
    private readonly notifications: INotificationRepository = NO_OP_NOTIFICATIONS,
  ) {}

  async execute(input: ProcessExpiredLeadOffersInput): Promise<ProcessExpiredLeadOffersOutput> {
    const expired = await this.leadQueueRepository.claimExpiredOffers(input.now)
    for (const offer of expired) {
      await passLeadToNextInQueue(
        offer.organizationId,
        offer.leadId,
        input.now,
        this.offerLeadToQueue,
        this.membershipRepository,
        this.notifications,
      )
    }
    return { expired: expired.length }
  }
}

/** Oferece o lead ao próximo da fila; sem próximo, avisa quem distribui.
 * Compartilhado com a recusa (RespondLeadOfferUseCase). */
export async function passLeadToNextInQueue(
  organizationId: string,
  leadId: string,
  now: Date,
  offerLeadToQueue: OfferLeadToQueueUseCase,
  membershipRepository: IMembershipRepository,
  notifications: INotificationRepository,
): Promise<void> {
  const result = await offerLeadToQueue.execute({ organizationId, leadId, now })
  if ((result.status === 'exhausted' || result.status === 'unavailable') && result.lead) {
    await notifyLeadDistributors(result.lead, membershipRepository, notifications, {
      queueExhausted: true,
    })
  }
}
