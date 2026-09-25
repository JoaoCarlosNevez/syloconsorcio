// DeleteFunnelUseCase — remove um funil, com 3 guardas de segurança:
// não pode ser o único funil da organização, não pode ser o funil padrão,
// e não pode ter leads (o usuário precisa mover/excluir os leads antes).

import { ValidationError } from '@sylocrm/domain'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type { IFunnelRepository } from '../ports/funnel.repository'
import type { UseCase } from '../ports/use-case'

export interface DeleteFunnelInput {
  id: string
  organizationId: string
  actorUserId?: string
}

export class DeleteFunnelUseCase implements UseCase<DeleteFunnelInput, boolean> {
  constructor(
    private readonly funnelRepository: IFunnelRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: DeleteFunnelInput): Promise<boolean> {
    const [funnel, allFunnels] = await Promise.all([
      this.funnelRepository.findById(input.id, input.organizationId),
      this.funnelRepository.listByOrganization(input.organizationId),
    ])
    if (!funnel) return false

    if (allFunnels.length <= 1) {
      throw new ValidationError([
        { field: 'id', message: 'A organização precisa ter ao menos um funil.' },
      ])
    }
    if (funnel.isDefault) {
      throw new ValidationError([
        { field: 'id', message: 'Defina outro funil como padrão antes de excluir este.' },
      ])
    }
    const leadCount = await this.funnelRepository.countLeadsByFunnel(input.id)
    if (leadCount > 0) {
      throw new ValidationError([
        { field: 'id', message: `Não é possível excluir — ${leadCount} lead(s) neste funil.` },
      ])
    }

    const deleted = await this.funnelRepository.delete(input.id, input.organizationId)

    if (deleted) {
      await this.activityLog.record({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId ?? null,
        action: 'funnel.deleted',
        entityType: 'funnel',
        entityId: funnel.id,
        entityLabel: funnel.name,
      })
    }

    return deleted
  }
}
