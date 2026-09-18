// UpdateLeadUseCase — atualiza um lead dentro do escopo do usuário.
//
// Quando `assignedUserId` muda, registra a mudança em lead_assignment_history
// (AGENTS.md §10 — "o modelo deve permitir histórico de atribuição").
// A checagem de Permission (lead.update / lead.assign) acontece na camada HTTP.
//
// Marcar como Ganho (stage: VENDA) só é permitido a partir de FECHADO — não dá
// pra "ganhar" um lead que ainda não passou pelas etapas anteriores do funil.

import { ValidationError } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import type { ILeadRepository, LeadRecord, UpdateLeadInput } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { resolveLeadScope } from './lead-scope'

export interface UpdateLeadUseCaseInput {
  id: string
  userId: string
  membership: MembershipContext
  changes: UpdateLeadInput
}

export class UpdateLeadUseCase implements UseCase<UpdateLeadUseCaseInput, LeadRecord | null> {
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(input: UpdateLeadUseCaseInput): Promise<LeadRecord | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )

    const isReassigning = input.changes.assignedUserId !== undefined
    const isMarkingWon = input.changes.stage === 'VENDA'
    const before =
      isReassigning || isMarkingWon ? await this.leadRepository.findById(input.id, scope) : null

    if (isMarkingWon && before && before.stage !== 'FECHADO') {
      throw new ValidationError([
        {
          field: 'stage',
          message: 'Só é possível marcar como Ganho a partir da etapa Fechado.',
        },
      ])
    }

    const updated = await this.leadRepository.update(input.id, scope, input.changes)
    if (!updated) return null

    if (isReassigning && before && before.assignedUserId !== updated.assignedUserId) {
      await this.leadRepository.recordAssignmentChange({
        leadId: updated.id,
        fromUserId: before.assignedUserId,
        toUserId: updated.assignedUserId,
        changedByUserId: input.userId,
      })
    }

    return updated
  }
}
