// ListFunnelsUseCase — lista os funis de uma organização, com estágios ordenados.

import type { FunnelRecord, IFunnelRepository } from '../ports/funnel.repository'
import type { UseCase } from '../ports/use-case'

export interface ListFunnelsInput {
  organizationId: string
}

export class ListFunnelsUseCase implements UseCase<ListFunnelsInput, FunnelRecord[]> {
  constructor(private readonly funnelRepository: IFunnelRepository) {}

  async execute(input: ListFunnelsInput): Promise<FunnelRecord[]> {
    return this.funnelRepository.listByOrganization(input.organizationId)
  }
}
