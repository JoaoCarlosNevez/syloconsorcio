import type { MembershipContext } from '../auth/auth-context'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { resolveLeadScope } from './lead-scope'
import { applyLeadVisibility } from './lead-visibility'

export interface GetLeadInput {
  id: string
  userId: string
  membership: MembershipContext
}

export class GetLeadUseCase implements UseCase<GetLeadInput, LeadRecord | null> {
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(input: GetLeadInput): Promise<LeadRecord | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.id, scope)
    if (!lead) return null

    return applyLeadVisibility(lead, input.membership.dataScope)
  }
}
