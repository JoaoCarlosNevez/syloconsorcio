// OfferLeadToQueueUseCase — oferece um lead sem responsável ao próximo da
// fila de distribuição (ver ILeadQueueRepository).
//
// O próximo é o primeiro da fila que ainda não recebeu oferta DESTE lead —
// assim o lead dá no máximo uma volta na fila. O membro vai pro fim da fila
// assim que recebe a oferta, aceitando ou não, e é avisado no sininho
// ('lead.offered') com o prazo pra aceitar.
//
// Não avisa ninguém quando não dá pra oferecer: quem chama decide (o webhook
// cai no aviso de sempre pra Dono/Supervisores; o processador de ofertas
// vencidas avisa que ninguém aceitou).

import type { ILeadQueueRepository } from '../ports/lead-queue.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import { type INotificationRepository, NO_OP_NOTIFICATIONS } from '../ports/notification.repository'
import type { UseCase } from '../ports/use-case'

export interface OfferLeadToQueueInput {
  organizationId: string
  leadId: string
  now: Date
}

/**
 * - offered: oferecido a alguém;
 * - unavailable: fila desligada ou sem participantes ativos;
 * - exhausted: todo mundo da fila já recebeu oferta deste lead;
 * - closed: o lead não existe mais, já tem responsável ou já foi ganho/perdido.
 */
export type OfferLeadToQueueStatus = 'offered' | 'unavailable' | 'exhausted' | 'closed'

export interface OfferLeadToQueueOutput {
  status: OfferLeadToQueueStatus
  /** Presente fora do 'closed' sem lead — pra quem chama avisar alguém. */
  lead: LeadRecord | null
}

export class OfferLeadToQueueUseCase
  implements UseCase<OfferLeadToQueueInput, OfferLeadToQueueOutput>
{
  constructor(
    private readonly leadQueueRepository: ILeadQueueRepository,
    private readonly leadRepository: ILeadRepository,
    private readonly notifications: INotificationRepository = NO_OP_NOTIFICATIONS,
  ) {}

  async execute(input: OfferLeadToQueueInput): Promise<OfferLeadToQueueOutput> {
    const lead = await this.leadRepository.findById(input.leadId, {
      organizationIds: [input.organizationId],
    })
    if (!lead || lead.assignedUserId || lead.lostAt || lead.wonAt) {
      return { status: 'closed', lead }
    }

    const settings = await this.leadQueueRepository.getSettings(input.organizationId)
    if (!settings.enabled) return { status: 'unavailable', lead }

    const queue = await this.leadQueueRepository.listQueue(input.organizationId)
    if (queue.length === 0) return { status: 'unavailable', lead }

    const alreadyOffered = new Set(await this.leadQueueRepository.listOfferedUserIds(lead.id))
    const next = queue.find((member) => !alreadyOffered.has(member.userId))
    if (!next) return { status: 'exhausted', lead }

    const expiresAt = new Date(input.now.getTime() + settings.timeoutMinutes * 60_000)
    const offer = await this.leadQueueRepository.createOffer({
      organizationId: input.organizationId,
      leadId: lead.id,
      userId: next.userId,
      offeredAt: input.now,
      expiresAt,
    })
    await this.leadQueueRepository.markOffered(input.organizationId, next.userId, input.now)

    await this.notifications.notify({
      organizationId: input.organizationId,
      userId: next.userId,
      actorUserId: null,
      type: 'lead.offered',
      taskId: null,
      title: lead.name,
      metadata: {
        leadId: lead.id,
        funnelId: lead.funnelId,
        offerId: offer.id,
        expiresAt: expiresAt.toISOString(),
      },
    })

    return { status: 'offered', lead }
  }
}
