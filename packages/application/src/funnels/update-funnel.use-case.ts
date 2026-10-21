// UpdateFunnelUseCase — renomeia um funil e/ou aplica diff na lista de estágios.
//
// Guarda: não deixa remover (omitir da lista `stages`) um estágio que ainda
// tem leads — o usuário precisa mover os leads antes.
//
// O funil ADM (kind BACKOFFICE) é fixo: nada nele pode ser alterado. E o
// gatilho "passar o bastão" (duplicateToFunnelId) não pode mais ser ligado —
// o Ganho de um funil de vendas já vai sozinho pro ADM; só desligar (null).

import { ValidationError } from '@sylocrm/domain'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type { FunnelRecord, IFunnelRepository, UpdateFunnelInput } from '../ports/funnel.repository'
import type { UseCase } from '../ports/use-case'

import { FIXED_FUNNEL_MESSAGE } from './backoffice-funnel'
export interface UpdateFunnelUseCaseInput {
  id: string
  organizationId: string
  changes: UpdateFunnelInput
  actorUserId?: string
}

export class UpdateFunnelUseCase implements UseCase<UpdateFunnelUseCaseInput, FunnelRecord | null> {
  constructor(
    private readonly funnelRepository: IFunnelRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: UpdateFunnelUseCaseInput): Promise<FunnelRecord | null> {
    const current = await this.funnelRepository.findById(input.id, input.organizationId)
    if (!current) return null

    if (current.kind === 'BACKOFFICE') {
      throw new ValidationError([{ field: 'id', message: FIXED_FUNNEL_MESSAGE }])
    }
    if (input.changes.duplicateToFunnelId) {
      throw new ValidationError([
        {
          field: 'duplicateToFunnelId',
          message: 'O lead ganho já vai sozinho pro funil ADM.',
        },
      ])
    }

    if (input.changes.stages) {
      if (input.changes.stages.length === 0) {
        throw new ValidationError([
          { field: 'stages', message: 'O funil precisa de ao menos um estágio.' },
        ])
      }

      const keepIds = new Set(input.changes.stages.filter((s) => s.id).map((s) => s.id as string))
      const removedStages = current.stages.filter((s) => !keepIds.has(s.id))
      for (const stage of removedStages) {
        const count = await this.funnelRepository.countLeadsByStage(stage.id)
        if (count > 0) {
          throw new ValidationError([
            {
              field: 'stages',
              message: `Não é possível remover o estágio "${stage.name}" — ${count} lead(s) estão nele.`,
            },
          ])
        }
      }
    }

    const updated = await this.funnelRepository.update(
      input.id,
      input.organizationId,
      input.changes,
    )

    if (updated) {
      await this.activityLog.record({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId ?? null,
        action: 'funnel.updated',
        entityType: 'funnel',
        entityId: updated.id,
        entityLabel: updated.name,
        metadata: {
          fields: Object.keys(input.changes).filter(
            (key) => input.changes[key as keyof UpdateFunnelInput] !== undefined,
          ),
          previousName: current.name !== updated.name ? current.name : null,
        },
      })
    }

    return updated
  }
}
