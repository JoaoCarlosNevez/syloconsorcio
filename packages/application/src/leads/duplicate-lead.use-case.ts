// DuplicateLeadUseCase — transferência manual de um lead pra outro funil
// ("passar o bastão pra outro setor" a qualquer momento, não só ao ganhar —
// ver gatilho automático em update-lead.use-case.ts). Cria uma cópia; o lead
// original não é alterado.

import type { MembershipContext } from '../auth/auth-context'
import type { IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { duplicateLeadRecord } from './duplicate-lead-record'
import { resolveLeadScope } from './lead-scope'

export interface DuplicateLeadUseCaseInput {
  id: string
  userId: string
  membership: MembershipContext
  targetFunnelId: string
}

export class DuplicateLeadUseCase implements UseCase<DuplicateLeadUseCaseInput, LeadRecord | null> {
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly funnelRepository: IFunnelRepository,
  ) {}

  async execute(input: DuplicateLeadUseCaseInput): Promise<LeadRecord | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const source = await this.leadRepository.findById(input.id, scope)
    if (!source) return null

    const sourceFunnel = await this.funnelRepository.findById(
      source.funnelId,
      source.organizationId,
    )

    return duplicateLeadRecord(
      this.leadRepository,
      this.funnelRepository,
      source,
      sourceFunnel?.name ?? '',
      input.targetFunnelId,
    )
  }
}
