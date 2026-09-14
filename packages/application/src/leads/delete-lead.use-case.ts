import type { MembershipContext } from '../auth/auth-context'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { resolveLeadScope } from './lead-scope'

export interface DeleteLeadInput {
  id: string
  userId: string
  membership: MembershipContext
}

export class DeleteLeadUseCase implements UseCase<DeleteLeadInput, boolean> {
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(input: DeleteLeadInput): Promise<boolean> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    return this.leadRepository.delete(input.id, scope)
  }
}
