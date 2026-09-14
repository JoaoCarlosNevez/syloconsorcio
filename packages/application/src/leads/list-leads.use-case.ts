// ListLeadsUseCase — lista leads paginados, filtrados pelo DataScope ativo.
//
// A checagem de Permission (lead.read) acontece na camada HTTP (requirePermission
// middleware), antes deste use case ser chamado — ver apps/api/src/routes/leads.route.ts.
// Este use case assume que a chamada já foi autorizada e cuida apenas da
// resolução de escopo de dados e da paginação server-side (regra P0).

import type { LeadStage } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import type { ILeadRepository, LeadListPage } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { resolveLeadScope } from './lead-scope'
import { applyLeadVisibility } from './lead-visibility'

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 25

export interface ListLeadsInput {
  userId: string
  membership: MembershipContext
  stage?: LeadStage
  search?: string
  page?: number
  pageSize?: number
}

export class ListLeadsUseCase implements UseCase<ListLeadsInput, LeadListPage> {
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(input: ListLeadsInput): Promise<LeadListPage> {
    const page = Math.max(1, input.page ?? 1)
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE))

    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )

    const result = await this.leadRepository.list(
      { ...scope, stage: input.stage, search: input.search },
      page,
      pageSize,
    )

    return {
      ...result,
      items: result.items.map((lead) => applyLeadVisibility(lead, input.membership.dataScope)),
    }
  }
}
