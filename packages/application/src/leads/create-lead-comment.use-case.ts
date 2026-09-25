// CreateLeadCommentUseCase — adiciona um comentário/anotação interna a um lead.
//
// Mesma resolução de escopo dos demais use cases de lead — só cria o
// comentário se o lead existir e estiver dentro do DataScope do usuário.

import type { MembershipContext } from '../auth/auth-context'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
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
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: CreateLeadCommentInput): Promise<LeadCommentRecord | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null

    const comment = await this.leadRepository.createComment({
      leadId: input.leadId,
      userId: input.userId,
      text: input.text,
    })

    await this.activityLog.record({
      organizationId: lead.organizationId,
      actorUserId: input.userId,
      action: 'lead.comment_added',
      entityType: 'lead',
      entityId: lead.id,
      entityLabel: lead.name,
      metadata: { preview: input.text.length > 120 ? `${input.text.slice(0, 117)}…` : input.text },
    })

    return comment
  }
}
