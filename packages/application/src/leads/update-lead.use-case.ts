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
//
// Cada efeito da atualização vira um evento no log de atividades: mudança de
// etapa, de responsável, Ganho/Perdido/reabertura, edição de campos e a cópia
// automática do "passar o bastão".

import { ValidationError } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import {
  type ActivityMetadata,
  type IActivityLogRepository,
  NO_OP_ACTIVITY_LOG,
  type NewActivityEntry,
} from '../ports/activity-log.repository'
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

/** Campos "de ficha" — mudanças neles viram um evento lead.updated. Etapa,
 * responsável e Ganho/Perdido têm eventos próprios. */
const EDITABLE_FIELDS = [
  'name',
  'phone',
  'email',
  'segment',
  'valueCents',
  'quotaCount',
  'source',
  'tags',
  'notes',
  'profession',
  'incomeCents',
  'maritalStatus',
  'cpf',
] as const satisfies readonly (keyof UpdateLeadInput & keyof LeadRecord)[]

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export class UpdateLeadUseCase implements UseCase<UpdateLeadUseCaseInput, LeadRecord | null> {
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly funnelRepository: IFunnelRepository,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  async execute(input: UpdateLeadUseCaseInput): Promise<LeadRecord | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )

    const isReassigning = input.changes.assignedUserId !== undefined
    const isMarkingWon = input.changes.won === true
    // Estado anterior — base da validação de telefone e de Ganho, do histórico
    // de atribuição e dos eventos do log de atividades.
    const before = await this.leadRepository.findById(input.id, scope)

    // Só valida unicidade se o telefone mudou de fato: o modal de edição sempre
    // reenvia o telefone, e cópias do lead em outros funis (duplicateLeadRecord)
    // compartilham o mesmo número — validar sempre travaria qualquer edição.
    const newPhone = input.changes.phone
    if (
      newPhone !== undefined &&
      newPhone.replace(/\D/g, '') !== before?.phone.replace(/\D/g, '')
    ) {
      const existing = await this.leadRepository.findByPhone(
        input.membership.organizationId,
        newPhone,
        input.id,
      )
      if (existing) {
        throw new ValidationError([
          { field: 'phone', message: 'Já existe um lead cadastrado com este telefone.' },
        ])
      }
    }

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

    if (before) await this.recordActivity(input.userId, before, updated, input.changes)

    if (isMarkingWon && updated.wonAt && wonFunnel?.duplicateToFunnelId) {
      const copy = await duplicateLeadRecord(
        this.leadRepository,
        this.funnelRepository,
        updated,
        wonFunnel.name,
        wonFunnel.duplicateToFunnelId,
      )
      const targetFunnel = await this.funnelRepository.findById(
        wonFunnel.duplicateToFunnelId,
        updated.organizationId,
      )
      await this.activityLog.record({
        organizationId: updated.organizationId,
        actorUserId: null,
        action: 'lead.duplicated',
        entityType: 'lead',
        entityId: copy.id,
        entityLabel: copy.name,
        metadata: {
          fromFunnelName: wonFunnel.name,
          toFunnelName: targetFunnel?.name ?? null,
          automatic: true,
        },
      })
    }

    return updated
  }

  private async recordActivity(
    actorUserId: string,
    before: LeadRecord,
    after: LeadRecord,
    changes: UpdateLeadInput,
  ): Promise<void> {
    const entries: NewActivityEntry[] = []
    const base = {
      organizationId: after.organizationId,
      actorUserId,
      entityType: 'lead' as const,
      entityId: after.id,
      entityLabel: after.name,
    }
    const push = (action: NewActivityEntry['action'], metadata: ActivityMetadata = {}) =>
      entries.push({ ...base, action, metadata })

    if (changes.stageId !== undefined && before.stageId !== after.stageId) {
      const funnel = await this.funnelRepository.findById(after.funnelId, after.organizationId)
      const stageName = (id: string) => funnel?.stages.find((s) => s.id === id)?.name ?? null
      push('lead.stage_changed', {
        fromStage: stageName(before.stageId),
        toStage: stageName(after.stageId),
        funnelName: funnel?.name ?? null,
      })
    }

    if (changes.assignedUserId !== undefined && before.assignedUserId !== after.assignedUserId) {
      push('lead.assigned', { fromUserId: before.assignedUserId, toUserId: after.assignedUserId })
    }

    if (changes.won === true && !before.wonAt && after.wonAt) {
      push('lead.won', { valueCents: after.valueCents })
    }
    if (changes.lost === true && !before.lostAt && after.lostAt) {
      push('lead.lost', { valueCents: after.valueCents })
    }
    if (changes.won === false && before.wonAt && !after.wonAt) {
      push('lead.reopened', { from: 'won' })
    }
    if (changes.lost === false && before.lostAt && !after.lostAt) {
      push('lead.reopened', { from: 'lost' })
    }

    const changedFields = EDITABLE_FIELDS.filter(
      (field) => changes[field] !== undefined && !sameValue(before[field], after[field]),
    )
    if (changedFields.length > 0) {
      push('lead.updated', { fields: [...changedFields] })
    }

    for (const entry of entries) await this.activityLog.record(entry)
  }
}
