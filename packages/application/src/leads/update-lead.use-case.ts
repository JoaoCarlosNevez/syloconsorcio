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
// Funil ADM (ver funnels/backoffice-funnel.ts): marcar como Ganho um lead de
// um funil de vendas cria automaticamente uma cópia dele — com a ficha de
// adesão e os documentos — na primeira etapa do funil ADM, mesmo vendedor
// como responsável. Ganho dentro do próprio ADM não copia (é o fim). O
// Vendedor não altera leads do funil ADM (só acompanha).
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
import { assertCanChangeLeadsInFunnel, ensureBackofficeFunnel } from '../funnels/backoffice-funnel'
import {
  type ActivityMetadata,
  type IActivityLogRepository,
  NO_OP_ACTIVITY_LOG,
  type NewActivityEntry,
} from '../ports/activity-log.repository'
import type { FunnelRecord, IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadAdhesionRepository } from '../ports/lead-adhesion.repository'
import type { ILeadRepository, LeadRecord, UpdateLeadInput } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { IStorageProvider } from '../ports/storage.provider'
import type { UseCase } from '../ports/use-case'
import { copyLeadAdhesion } from './copy-lead-adhesion'
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
    /** Pra levar a ficha de adesão e os documentos pro card do ADM. Sem eles
     * (testes antigos), o card nasce só com os dados do lead. */
    private readonly adhesionCopy: {
      leadAdhesionRepository: ILeadAdhesionRepository
      storage: IStorageProvider
    } | null = null,
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

    const currentFunnel = before
      ? await this.funnelRepository.findById(before.funnelId, before.organizationId)
      : null
    assertCanChangeLeadsInFunnel(currentFunnel, input.membership)

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

    // Perder exige motivo — é o que diz ao gestor onde o time está perdendo
    // venda (parcela alta, concorrente, sem lance…).
    const lostReason = input.changes.lostReason?.trim()
    if (input.changes.lost === true && before && !before.lostAt && !lostReason) {
      throw new ValidationError([{ field: 'lostReason', message: 'Informe o motivo da perda.' }])
    }
    // Lead já perdido marcado de novo sem motivo mantém o motivo que tinha.
    const changes =
      input.changes.lost === true
        ? { ...input.changes, lostReason: lostReason || before?.lostReason || undefined }
        : input.changes

    let wonFunnel: FunnelRecord | null = null
    if (isMarkingWon && before) {
      wonFunnel = currentFunnel
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

    const updated = await this.leadRepository.update(input.id, scope, changes)
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

    // Só no Ganho de verdade (não reenvio de won: true num lead já ganho).
    if (isMarkingWon && !before?.wonAt && updated.wonAt && wonFunnel?.kind === 'SALES') {
      const targetFunnel = await ensureBackofficeFunnel(
        this.funnelRepository,
        updated.organizationId,
      )
      const copy = await duplicateLeadRecord(
        this.leadRepository,
        this.funnelRepository,
        updated,
        wonFunnel.name,
        targetFunnel.id,
      )
      if (this.adhesionCopy) {
        await copyLeadAdhesion(
          this.adhesionCopy.leadAdhesionRepository,
          this.adhesionCopy.storage,
          updated,
          copy,
          input.userId,
        )
      }
      await this.activityLog.record({
        organizationId: updated.organizationId,
        actorUserId: null,
        action: 'lead.duplicated',
        entityType: 'lead',
        entityId: copy.id,
        entityLabel: copy.name,
        metadata: {
          fromFunnelName: wonFunnel.name,
          toFunnelName: targetFunnel.name,
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
      push('lead.lost', { valueCents: after.valueCents, reason: after.lostReason })
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
