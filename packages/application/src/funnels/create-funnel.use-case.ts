// CreateFunnelUseCase — cria um funil novo com seus estágios iniciais.

import { ValidationError } from '@sylocrm/domain'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
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
  actorUserId?: string
}

export class CreateFunnelUseCase implements UseCase<CreateFunnelInput, FunnelRecord> {
  constructor(
    private readonly funnelRepository: IFunnelRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: CreateFunnelInput): Promise<FunnelRecord> {
    if (input.stages.length === 0) {
      throw new ValidationError([
        { field: 'stages', message: 'O funil precisa de ao menos um estágio.' },
      ])
    }
    const { actorUserId, ...funnelInput } = input
    const funnel = await this.funnelRepository.create(funnelInput)

    await this.activityLog.record({
      organizationId: funnel.organizationId,
      actorUserId: actorUserId ?? null,
      action: 'funnel.created',
      entityType: 'funnel',
      entityId: funnel.id,
      entityLabel: funnel.name,
      metadata: { stageCount: funnel.stages.length },
    })

    return funnel
  }
}
