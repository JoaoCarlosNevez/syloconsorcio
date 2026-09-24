// ListLeadProposalsUseCase — propostas/simulações de crédito de um lead, mais
// recentes primeiro. Mesma resolução de escopo dos demais use cases de lead.

import type { MembershipContext } from '../auth/auth-context'
import type { ILeadProposalRepository, LeadProposalRecord } from '../ports/lead-proposal.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { resolveLeadScope } from './lead-scope'

export interface ListLeadProposalsInput {
  leadId: string
  userId: string
  membership: MembershipContext
}

export class ListLeadProposalsUseCase
  implements UseCase<ListLeadProposalsInput, LeadProposalRecord[] | null>
{
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly leadProposalRepository: ILeadProposalRepository,
  ) {}

  async execute(input: ListLeadProposalsInput): Promise<LeadProposalRecord[] | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null

    return this.leadProposalRepository.listByLead(input.leadId)
  }
}
