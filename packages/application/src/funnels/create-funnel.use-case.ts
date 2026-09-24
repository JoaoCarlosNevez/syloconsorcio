// CreateFunnelUseCase — cria um funil novo com seus estágios iniciais.

import { ValidationError } from '@sylocrm/domain'
import type {
  FunnelRecord,
  IFunnelRepository,
  NewFunnelStageInput,
} from '../ports/funnel.repository'
import type { UseCase } from '../ports/use-case'

export interface CreateFunnelInput {
  organizationId: string
  name: string
  stages: NewFunnelStageInput[]
}

export class CreateFunnelUseCase implements UseCase<CreateFunnelInput, FunnelRecord> {
  constructor(private readonly funnelRepository: IFunnelRepository) {}

  async execute(input: CreateFunnelInput): Promise<FunnelRecord> {
    if (input.stages.length === 0) {
      throw new ValidationError([
        { field: 'stages', message: 'O funil precisa de ao menos um estágio.' },
      ])
    }
    return this.funnelRepository.create(input)
  }
}
