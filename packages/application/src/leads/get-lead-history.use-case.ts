// GetLeadHistoryUseCase — feed combinado de histórico de atribuição + comentários.
//
// Usa a mesma resolução de escopo que GetLeadUseCase: só retorna o histórico
// se o lead existir e estiver dentro do DataScope do usuário.

import type { MembershipContext } from '../auth/auth-context'
import type {
  AssignmentHistoryRecord,
  ILeadRepository,
  LeadCommentRecord,
} from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { resolveLeadScope } from './lead-scope'

export interface GetLeadHistoryInput {
  id: string
  userId: string
  membership: MembershipContext
}

export interface LeadHistory {
  assignmentHistory: AssignmentHistoryRecord[]
  comments: LeadCommentRecord[]
}

export class GetLeadHistoryUseCase implements UseCase<GetLeadHistoryInput, LeadHistory | null> {
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(input: GetLeadHistoryInput): Promise<LeadHistory | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.id, scope)
    if (!lead) return null

    const [assignmentHistory, comments] = await Promise.all([
      this.leadRepository.listAssignmentHistory(input.id),
      this.leadRepository.listComments(input.id),
    ])

    return { assignmentHistory, comments }
  }
}
