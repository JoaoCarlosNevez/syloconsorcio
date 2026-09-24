// DeleteFunnelUseCase — remove um funil, com 3 guardas de segurança:
// não pode ser o único funil da organização, não pode ser o funil padrão,
// e não pode ter leads (o usuário precisa mover/excluir os leads antes).

import { ValidationError } from '@sylocrm/domain'
import type { IFunnelRepository } from '../ports/funnel.repository'
import type { UseCase } from '../ports/use-case'

export interface DeleteFunnelInput {
  id: string
  organizationId: string
}

export class DeleteFunnelUseCase implements UseCase<DeleteFunnelInput, boolean> {
  constructor(private readonly funnelRepository: IFunnelRepository) {}

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

    return this.funnelRepository.delete(input.id, input.organizationId)
  }
}
