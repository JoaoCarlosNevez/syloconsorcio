// Checklist do funil do lead (ADM e Pós-venda — itens em
// funnels/funnel-checklists.ts).
//
// - Ler: itens do funil atual do lead, marcados ou não (quem e quando).
// - Marcar/desmarcar: grava, registra no histórico e, ao marcar um item com
//   `moveTo`, leva o card pra essa etapa se ele ainda estiver antes dela
//   (nunca volta). A mudança passa pelo UpdateLeadUseCase — mesmas regras,
//   mesmo histórico de etapa.
// - Vendedor não mexe no checklist do ADM (só acompanha — ver system-funnels).

import { ValidationError } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import { checklistFor } from '../funnels/funnel-checklists'
import { assertCanChangeLeadsInFunnel } from '../funnels/system-funnels'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type { FunnelKind, IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadChecklistRepository } from '../ports/lead-checklist.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { UseCase } from '../ports/use-case'
import { resolveLeadScope } from './lead-scope'
import type { UpdateLeadUseCase } from './update-lead.use-case'

export interface LeadChecklistInput {
  leadId: string
  userId: string
  membership: MembershipContext
}

export interface LeadChecklistView {
  funnelKind: FunnelKind
  items: {
    key: string
    label: string
    checked: boolean
    checkedAt: Date | null
    checkedByUserId: string | null
  }[]
}

async function loadView(
  checklistRepository: ILeadChecklistRepository,
  leadId: string,
  funnelKind: FunnelKind,
): Promise<LeadChecklistView> {
  const checked = new Map(
    (await checklistRepository.listChecked(leadId)).map((item) => [item.itemKey, item] as const),
  )
  return {
    funnelKind,
    items: checklistFor(funnelKind).map((item) => {
      const mark = checked.get(item.key)
      return {
        key: item.key,
        label: item.label,
        checked: Boolean(mark),
        checkedAt: mark?.checkedAt ?? null,
        checkedByUserId: mark?.checkedByUserId ?? null,
      }
    }),
  }
}

export class GetLeadChecklistUseCase
  implements UseCase<LeadChecklistInput, LeadChecklistView | null>
{
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly funnelRepository: IFunnelRepository,
    private readonly checklistRepository: ILeadChecklistRepository,
  ) {}

  /** null quando o lead não existe ou está fora do escopo. */
  async execute(input: LeadChecklistInput): Promise<LeadChecklistView | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null
    const funnel = await this.funnelRepository.findById(lead.funnelId, lead.organizationId)
    if (!funnel) return null
    return loadView(this.checklistRepository, lead.id, funnel.kind)
  }
}

export interface ToggleLeadChecklistItemInput extends LeadChecklistInput {
  itemKey: string
  checked: boolean
}

export class ToggleLeadChecklistItemUseCase
  implements UseCase<ToggleLeadChecklistItemInput, LeadChecklistView | null>
{
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly funnelRepository: IFunnelRepository,
    private readonly checklistRepository: ILeadChecklistRepository,
    private readonly updateLead: UpdateLeadUseCase,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  /** null quando o lead não existe ou está fora do escopo. */
  async execute(input: ToggleLeadChecklistItemInput): Promise<LeadChecklistView | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null
    const funnel = await this.funnelRepository.findById(lead.funnelId, lead.organizationId)
    if (!funnel) return null
    assertCanChangeLeadsInFunnel(funnel, input.membership)

    const item = checklistFor(funnel.kind).find((i) => i.key === input.itemKey)
    if (!item) {
      throw new ValidationError([
        { field: 'itemKey', message: 'Este item não faz parte do checklist deste funil.' },
      ])
    }

    let changed = true
    if (input.checked) {
      await this.checklistRepository.check(lead.id, item.key, input.userId)
    } else {
      changed = await this.checklistRepository.uncheck(lead.id, item.key)
    }

    if (changed) {
      await this.activityLog.record({
        organizationId: lead.organizationId,
        actorUserId: input.userId,
        action: input.checked ? 'lead.checklist_checked' : 'lead.checklist_unchecked',
        entityType: 'lead',
        entityId: lead.id,
        entityLabel: lead.name,
        metadata: { item: item.key, label: item.label, funnelName: funnel.name },
      })
    }

    // Leva o card pra frente (nunca pra trás, nem lead já ganho/perdido).
    if (input.checked && item.moveTo && !lead.wonAt && !lead.lostAt) {
      const target = funnel.stages.find((stage) => stage.name === item.moveTo)
      const current = funnel.stages.find((stage) => stage.id === lead.stageId)
      if (target && current && target.position > current.position) {
        await this.updateLead.execute({
          id: lead.id,
          userId: input.userId,
          membership: input.membership,
          changes: { stageId: target.id },
        })
      }
    }

    return loadView(this.checklistRepository, lead.id, funnel.kind)
  }
}
