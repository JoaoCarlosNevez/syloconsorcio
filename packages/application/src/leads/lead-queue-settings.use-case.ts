// Fila de Leads em Configurações — ver e salvar a configuração, junto com a
// ordem atual da fila e os leads aguardando aceite.

import { ValidationError } from '@sylocrm/domain'
import type { ILeadQueueRepository, LeadQueueSettings } from '../ports/lead-queue.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { UseCase } from '../ports/use-case'

export const LEAD_QUEUE_TIMEOUT_LIMITS = { min: 1, max: 120 } as const

export interface LeadQueueOverview {
  settings: LeadQueueSettings
  /** Participantes ativos na ordem da fila — o primeiro recebe o próximo lead. */
  queue: { userId: string; lastOfferedAt: Date }[]
  pendingOffers: {
    id: string
    userId: string
    leadId: string
    leadName: string
    offeredAt: Date
    expiresAt: Date
  }[]
}

export class GetLeadQueueUseCase
  implements UseCase<{ organizationId: string; now: Date }, LeadQueueOverview>
{
  constructor(
    private readonly leadQueueRepository: ILeadQueueRepository,
    private readonly leadRepository: ILeadRepository,
  ) {}

  async execute(input: { organizationId: string; now: Date }): Promise<LeadQueueOverview> {
    const [settings, queue, offers] = await Promise.all([
      this.leadQueueRepository.getSettings(input.organizationId),
      this.leadQueueRepository.listQueue(input.organizationId),
      this.leadQueueRepository.listPendingOffers({
        organizationId: input.organizationId,
        now: input.now,
      }),
    ])
    const pendingOffers: LeadQueueOverview['pendingOffers'] = []
    for (const offer of offers) {
      const lead = await this.leadRepository.findById(offer.leadId, {
        organizationIds: [input.organizationId],
      })
      if (!lead) continue
      pendingOffers.push({
        id: offer.id,
        userId: offer.userId,
        leadId: lead.id,
        leadName: lead.name,
        offeredAt: offer.offeredAt,
        expiresAt: offer.expiresAt,
      })
    }
    return { settings, queue, pendingOffers }
  }
}

export interface UpdateLeadQueueSettingsInput {
  organizationId: string
  enabled: boolean
  timeoutMinutes: number
  memberUserIds: string[]
  now: Date
}

export class UpdateLeadQueueSettingsUseCase
  implements UseCase<UpdateLeadQueueSettingsInput, LeadQueueSettings>
{
  constructor(
    private readonly leadQueueRepository: ILeadQueueRepository,
    private readonly membershipRepository: IMembershipRepository,
  ) {}

  async execute(input: UpdateLeadQueueSettingsInput): Promise<LeadQueueSettings> {
    const { min, max } = LEAD_QUEUE_TIMEOUT_LIMITS
    if (
      !Number.isInteger(input.timeoutMinutes) ||
      input.timeoutMinutes < min ||
      input.timeoutMinutes > max
    ) {
      throw new ValidationError([
        {
          field: 'timeoutMinutes',
          message: `O tempo pra aceitar precisa ser entre ${min} e ${max} minutos.`,
        },
      ])
    }

    const members = await this.membershipRepository.findActiveByOrganizationId(input.organizationId)
    const activeIds = new Set(members.filter((m) => m.status === 'ACTIVE').map((m) => m.userId))
    const unknown = input.memberUserIds.filter((id) => !activeIds.has(id))
    if (unknown.length > 0) {
      throw new ValidationError([
        { field: 'memberUserIds', message: 'Só membros ativos da organização entram na fila.' },
      ])
    }
    if (input.enabled && input.memberUserIds.length === 0) {
      throw new ValidationError([
        { field: 'memberUserIds', message: 'Escolha pelo menos uma pessoa pra fila.' },
      ])
    }

    return this.leadQueueRepository.saveSettings(
      {
        organizationId: input.organizationId,
        enabled: input.enabled,
        timeoutMinutes: input.timeoutMinutes,
        memberUserIds: [...new Set(input.memberUserIds)],
      },
      input.now,
    )
  }
}
