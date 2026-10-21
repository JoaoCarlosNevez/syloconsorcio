// Ficha (checklist) de adesão do lead — ler e salvar.
//
// Mesma regra de visibilidade do lead (resolveLeadScope): quem não enxerga o
// lead não lê nem edita a ficha. O vendedor da ficha precisa ser membro ativo
// da organização do lead.

import { ValidationError } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type {
  ILeadAdhesionRepository,
  LeadAdhesionFields,
  LeadAdhesionRecord,
} from '../ports/lead-adhesion.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { resolveLeadScope } from './lead-scope'

interface LeadAccessInput {
  leadId: string
  userId: string
  membership: MembershipContext
}

export interface GetLeadAdhesionOutput {
  /** null = ficha ainda não preenchida. */
  adhesion: LeadAdhesionRecord | null
}

export class GetLeadAdhesionUseCase
  implements UseCase<LeadAccessInput, GetLeadAdhesionOutput | null>
{
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly leadAdhesionRepository: ILeadAdhesionRepository,
  ) {}

  /** null quando o lead não existe ou está fora do escopo. */
  async execute(input: LeadAccessInput): Promise<GetLeadAdhesionOutput | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null
    return { adhesion: await this.leadAdhesionRepository.findByLead(lead.id) }
  }
}

export interface SaveLeadAdhesionInput extends LeadAccessInput {
  fields: LeadAdhesionFields
}

export class SaveLeadAdhesionUseCase
  implements UseCase<SaveLeadAdhesionInput, LeadAdhesionRecord | null>
{
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly membershipRepository: IMembershipRepository,
    private readonly leadAdhesionRepository: ILeadAdhesionRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  /** null quando o lead não existe ou está fora do escopo. */
  async execute(input: SaveLeadAdhesionInput): Promise<LeadAdhesionRecord | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null

    if (input.fields.sellerUserId) {
      const members = await this.membershipRepository.findActiveByOrganizationId(
        lead.organizationId,
      )
      const isActiveMember = members.some(
        (m) => m.userId === input.fields.sellerUserId && m.status === 'ACTIVE',
      )
      if (!isActiveMember) {
        throw new ValidationError([
          { field: 'sellerUserId', message: 'O vendedor precisa ser membro ativo da organização.' },
        ])
      }
    }

    const adhesion = await this.leadAdhesionRepository.upsert({
      ...input.fields,
      leadId: lead.id,
      organizationId: lead.organizationId,
      updatedByUserId: input.userId,
    })

    const filled = Object.values(input.fields).filter((value) => value !== null).length
    await this.activityLog.record({
      organizationId: lead.organizationId,
      actorUserId: input.userId,
      action: 'lead.adhesion_updated',
      entityType: 'lead',
      entityId: lead.id,
      entityLabel: lead.name,
      metadata: { filledFields: filled },
    })

    return adhesion
  }
}
