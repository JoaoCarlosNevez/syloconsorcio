// UpdateFunnelUseCase — renomeia um funil e/ou aplica diff na lista de estágios.
//
// Guarda: não deixa remover (omitir da lista `stages`) um estágio que ainda
// tem leads — o usuário precisa mover os leads antes.
//
// Guarda adicional: duplicateToFunnelId (gatilho "passar o bastão" — ver
// funnel.repository.ts) precisa apontar pra um funil existente na mesma
// organização, diferente do próprio funil.

import { ValidationError } from '@sylocrm/domain'
import type { FunnelRecord, IFunnelRepository, UpdateFunnelInput } from '../ports/funnel.repository'
import type { UseCase } from '../ports/use-case'

export interface UpdateFunnelUseCaseInput {
  id: string
  organizationId: string
  changes: UpdateFunnelInput
}

export class UpdateFunnelUseCase implements UseCase<UpdateFunnelUseCaseInput, FunnelRecord | null> {
  constructor(private readonly funnelRepository: IFunnelRepository) {}

  async execute(input: UpdateFunnelUseCaseInput): Promise<FunnelRecord | null> {
    const current = await this.funnelRepository.findById(input.id, input.organizationId)
    if (!current) return null

    if (input.changes.duplicateToFunnelId) {
      if (input.changes.duplicateToFunnelId === input.id) {
        throw new ValidationError([
          {
            field: 'duplicateToFunnelId',
            message: 'O funil de destino não pode ser o próprio funil.',
          },
        ])
      }
      const target = await this.funnelRepository.findById(
        input.changes.duplicateToFunnelId,
        input.organizationId,
      )
      if (!target) {
        throw new ValidationError([
          { field: 'duplicateToFunnelId', message: 'Funil de destino não encontrado.' },
        ])
      }
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

    return this.funnelRepository.update(input.id, input.organizationId, input.changes)
  }
}
