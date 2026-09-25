// CreateLeadProposalUseCase — registra uma proposta/simulação de crédito
// aprovada pro lead. Sem valor de parcela de propósito (ver nota em
// schema/lead-proposals.ts) — só valida que a entrada é menor que o valor da
// cota, checado aqui contra o valueCents real do lead, nunca confiado ao
// cliente.

import { ValidationError } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type { ILeadProposalRepository, LeadProposalRecord } from '../ports/lead-proposal.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { resolveLeadScope } from './lead-scope'

export interface CreateLeadProposalInput {
  leadId: string
  userId: string
  membership: MembershipContext
  downPaymentCents: number
  termMonths: number
}

export class CreateLeadProposalUseCase
  implements UseCase<CreateLeadProposalInput, LeadProposalRecord | null>
{
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly leadProposalRepository: ILeadProposalRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: CreateLeadProposalInput): Promise<LeadProposalRecord | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null

    if (input.downPaymentCents >= lead.valueCents) {
      throw new ValidationError([
        {
          field: 'downPaymentCents',
          message: 'O valor de entrada precisa ser menor que o valor da cota.',
        },
      ])
    }

    const proposal = await this.leadProposalRepository.create({
      leadId: input.leadId,
      downPaymentCents: input.downPaymentCents,
      termMonths: input.termMonths,
    })

    await this.activityLog.record({
      organizationId: lead.organizationId,
      actorUserId: input.userId,
      action: 'lead.proposal_created',
      entityType: 'lead',
      entityId: lead.id,
      entityLabel: lead.name,
      metadata: { downPaymentCents: input.downPaymentCents, termMonths: input.termMonths },
    })

    return proposal
  }
}
