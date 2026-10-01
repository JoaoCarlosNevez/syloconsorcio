// RespondLeadOfferUseCase — o vendedor aceita ou recusa o lead que a fila
// ofereceu a ele.
//
// Aceitar (dentro do prazo) torna o vendedor responsável pelo lead, com
// registro no histórico de atribuição. Recusar passa o lead na hora pro
// próximo da fila — o vendedor já tinha ido pro fim da fila ao receber a
// oferta, então recusar não muda a posição dele.

import { ConflictError } from '@sylocrm/domain'
import type { ILeadQueueRepository } from '../ports/lead-queue.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import { type INotificationRepository, NO_OP_NOTIFICATIONS } from '../ports/notification.repository'
import type { UseCase } from '../ports/use-case'
import type { OfferLeadToQueueUseCase } from './offer-lead-to-queue.use-case'
import { passLeadToNextInQueue } from './process-expired-lead-offers.use-case'

export interface RespondLeadOfferInput {
  offerId: string
  userId: string
  organizationId: string
  action: 'accept' | 'decline'
  now: Date
}

export type RespondLeadOfferOutput = { action: 'accept'; lead: LeadRecord } | { action: 'decline' }

export class RespondLeadOfferUseCase
  implements UseCase<RespondLeadOfferInput, RespondLeadOfferOutput | null>
{
  constructor(
    private readonly leadQueueRepository: ILeadQueueRepository,
    private readonly leadRepository: ILeadRepository,
    private readonly offerLeadToQueue: OfferLeadToQueueUseCase,
    private readonly membershipRepository: IMembershipRepository,
    private readonly notifications: INotificationRepository = NO_OP_NOTIFICATIONS,
  ) {}

  /** null quando a oferta não existe ou não é deste usuário/organização. */
  async execute(input: RespondLeadOfferInput): Promise<RespondLeadOfferOutput | null> {
    const offer = await this.leadQueueRepository.findOffer(input.offerId)
    if (!offer || offer.userId !== input.userId || offer.organizationId !== input.organizationId) {
      return null
    }

    if (input.action === 'decline') {
      const declined = await this.leadQueueRepository.resolveOffer(offer.id, 'declined', input.now)
      // Já tinha vencido/sido respondida: o processador de vencidas cuida dela.
      if (declined) {
        await passLeadToNextInQueue(
          offer.organizationId,
          offer.leadId,
          input.now,
          this.offerLeadToQueue,
          this.membershipRepository,
          this.notifications,
        )
      }
      return { action: 'decline' }
    }

    const scope = { organizationIds: [offer.organizationId] }
    const lead = await this.leadRepository.findById(offer.leadId, scope)
    if (!lead || lead.assignedUserId) {
      await this.leadQueueRepository.resolveOffer(offer.id, 'cancelled', input.now)
      throw new ConflictError('Este lead já foi atribuído a outra pessoa.')
    }

    const accepted = await this.leadQueueRepository.resolveOffer(offer.id, 'accepted', input.now)
    if (!accepted) {
      throw new ConflictError('O tempo pra aceitar este lead acabou — ele foi pro próximo da fila.')
    }

    const updated = await this.leadRepository.update(lead.id, scope, {
      assignedUserId: input.userId,
    })
    if (!updated) throw new ConflictError('Este lead não existe mais.')
    await this.leadRepository.recordAssignmentChange({
      leadId: lead.id,
      fromUserId: null,
      toUserId: input.userId,
      changedByUserId: input.userId,
    })

    return { action: 'accept', lead: updated }
  }
}
