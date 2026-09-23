// CreateLeadCommentUseCase — adiciona um comentário/anotação interna a um lead.
//
// Mesma resolução de escopo dos demais use cases de lead — só cria o
// comentário se o lead existir e estiver dentro do DataScope do usuário.

import type { MembershipContext } from '../auth/auth-context'
import type { ILeadRepository, LeadCommentRecord } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { resolveLeadScope } from './lead-scope'

export interface CreateLeadCommentInput {
  leadId: string
  userId: string
  membership: MembershipContext
  text: string
}

export class CreateLeadCommentUseCase
  implements UseCase<CreateLeadCommentInput, LeadCommentRecord | null>
{
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(input: CreateLeadCommentInput): Promise<LeadCommentRecord | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null

    return this.leadRepository.createComment({
      leadId: input.leadId,
      userId: input.userId,
      text: input.text,
    })
  }
}
