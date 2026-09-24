// UpdateLeadUseCase — atualiza um lead dentro do escopo do usuário.
//
// Quando `assignedUserId` muda, registra a mudança em lead_assignment_history
// (AGENTS.md §10 — "o modelo deve permitir histórico de atribuição").
// A checagem de Permission (lead.update / lead.assign) acontece na camada HTTP.
//
// Marcar como Ganho (won: true) só é permitido a partir da ÚLTIMA etapa (por
// posição) do funil do lead — não dá pra "ganhar" um lead que ainda não passou
// pelas etapas anteriores. Ganho/Perdido são independentes do estágio (ver
// plano "Múltiplos funis customizáveis") — reabrir (won: false) nunca mexe em
// stageId, só limpa wonAt.
//
// Gatilho "passar o bastão": se o funil do lead tem duplicateToFunnelId
// configurado (ver funnel.repository.ts / Configurações > Funis), marcar como
// Ganho cria automaticamente uma cópia do lead no primeiro estágio do funil
// de destino — ver duplicate-lead-record.ts.
//
// Telefone é único por organização — editar o telefone de um lead pra um que
// já pertence a outro lead da mesma org é rejeitado (mesma regra da criação,
// ver create-lead.use-case.ts).

import { ValidationError } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import type { FunnelRecord, IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadRepository, LeadRecord, UpdateLeadInput } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { duplicateLeadRecord } from './duplicate-lead-record'
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
    private readonly funnelRepository: IFunnelRepository,
  ) {}

  async execute(input: UpdateLeadUseCaseInput): Promise<LeadRecord | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )

    if (input.changes.phone !== undefined) {
      const existing = await this.leadRepository.findByPhone(
        input.membership.organizationId,
        input.changes.phone,
        input.id,
      )
      if (existing) {
        throw new ValidationError([
          { field: 'phone', message: 'Já existe um lead cadastrado com este telefone.' },
        ])
      }
    }

    const isReassigning = input.changes.assignedUserId !== undefined
    const isMarkingWon = input.changes.won === true
    const before =
      isReassigning || isMarkingWon ? await this.leadRepository.findById(input.id, scope) : null

    let wonFunnel: FunnelRecord | null = null
    if (isMarkingWon && before) {
      wonFunnel = await this.funnelRepository.findById(before.funnelId, before.organizationId)
      const lastStage = wonFunnel?.stages[wonFunnel.stages.length - 1]
      if (!lastStage || before.stageId !== lastStage.id) {
        throw new ValidationError([
          {
            field: 'won',
            message: 'Só é possível marcar como Ganho a partir da última etapa do funil.',
          },
        ])
      }
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

    if (isMarkingWon && updated.wonAt && wonFunnel?.duplicateToFunnelId) {
      await duplicateLeadRecord(
        this.leadRepository,
        this.funnelRepository,
        updated,
        wonFunnel.name,
        wonFunnel.duplicateToFunnelId,
      )
    }

    return updated
  }
}
