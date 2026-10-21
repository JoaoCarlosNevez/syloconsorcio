// Tests: checklist do funil do lead — marcar move o card pra frente, nunca
// volta; vendedor não mexe no ADM.

import {
  AuthorizationError,
  DataScope,
  OrganizationType,
  Role,
  ValidationError,
} from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { MembershipContext } from '../auth/auth-context'
import type { IActivityLogRepository } from '../ports/activity-log.repository'
import type { FunnelRecord, IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadChecklistRepository } from '../ports/lead-checklist.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import { GetLeadChecklistUseCase, ToggleLeadChecklistItemUseCase } from './lead-checklist.use-cases'
import type { UpdateLeadUseCase } from './update-lead.use-case'

const MANAGER: MembershipContext = {
  organizationId: 'org-01',
  organizationType: OrganizationType.REPRESENTACAO,
  organizationName: 'Sylo',
  organizationIconUrl: null,
  organizationSecondaryColor: null,
  tier: 'bronze',
  role: Role.MANAGER,
  dataScope: DataScope.REPRESENTATION,
  permissions: [],
}

function funnel(kind: FunnelRecord['kind'], stages: string[]): FunnelRecord {
  return {
    id: 'funnel-01',
    organizationId: 'org-01',
    name: kind,
    isDefault: false,
    duplicateToFunnelId: null,
    kind,
    stages: stages.map((name, position) => ({
      id: `stage-${position}`,
      funnelId: 'funnel-01',
      name,
      color: '#000',
      position,
    })),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

const POST_SALE = funnel('POST_SALE', [
  'Boas-vindas',
  'Aguardando 1º boleto',
  'Em dia',
  'Atrasado',
  'Contemplado',
])
const ADM = funnel('BACKOFFICE', [
  'Conferência de documentos',
  'Digitado na administradora',
  'Pendência',
  'Efetivado',
])

function setup(f: FunnelRecord, lead: Partial<LeadRecord> = {}) {
  const leadRepository = {
    findById: vi.fn().mockResolvedValue({
      id: 'lead-01',
      organizationId: 'org-01',
      name: 'Maria',
      funnelId: f.id,
      stageId: 'stage-1',
      wonAt: null,
      lostAt: null,
      ...lead,
    }),
  } as unknown as ILeadRepository
  const organizationRepository = {
    findChildOrganizationIds: vi.fn().mockResolvedValue([]),
  } as unknown as IOrganizationRepository
  const funnelRepository = {
    findById: vi.fn().mockResolvedValue(f),
  } as unknown as IFunnelRepository
  const checked: { itemKey: string; checkedByUserId: string; checkedAt: Date }[] = []
  const checklistRepository: ILeadChecklistRepository = {
    listChecked: vi.fn(async () => checked),
    check: vi.fn(async (_lead, itemKey, userId) => {
      const item = { itemKey, checkedByUserId: userId, checkedAt: new Date() }
      checked.push(item)
      return item
    }),
    uncheck: vi.fn().mockResolvedValue(true),
  }
  const updateLead = { execute: vi.fn().mockResolvedValue({}) } as unknown as UpdateLeadUseCase
  const activityLog: IActivityLogRepository = { record: vi.fn(), list: vi.fn() }
  const toggle = new ToggleLeadChecklistItemUseCase(
    leadRepository,
    organizationRepository,
    funnelRepository,
    checklistRepository,
    updateLead,
    activityLog,
  )
  const get = new GetLeadChecklistUseCase(
    leadRepository,
    organizationRepository,
    funnelRepository,
    checklistRepository,
  )
  return { toggle, get, updateLead, activityLog, checklistRepository }
}

const base = { leadId: 'lead-01', userId: 'user-01', membership: MANAGER }

describe('lead checklist', () => {
  it('lists the items of the lead funnel', async () => {
    const { get } = setup(POST_SALE)

    const view = await get.execute(base)

    expect(view?.funnelKind).toBe('POST_SALE')
    expect(view?.items.map((i) => i.key)).toEqual([
      'welcome_done',
      'first_installment_paid',
      'first_assembly',
      'second_installment_paid',
      'third_installment_paid',
      'contemplated',
    ])
  })

  it('"1ª parcela paga" moves the card forward to "Em dia" and logs it', async () => {
    const { toggle, updateLead, activityLog } = setup(POST_SALE) // em "Aguardando 1º boleto"

    const view = await toggle.execute({ ...base, itemKey: 'first_installment_paid', checked: true })

    expect(view?.items.find((i) => i.key === 'first_installment_paid')?.checked).toBe(true)
    expect(updateLead.execute).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lead-01', changes: { stageId: 'stage-2' } }),
    )
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'lead.checklist_checked',
        metadata: expect.objectContaining({
          item: 'first_installment_paid',
          label: '1ª parcela paga',
        }),
      }),
    )
  })

  it('never moves the card backwards', async () => {
    const { toggle, updateLead } = setup(POST_SALE, { stageId: 'stage-3' }) // Atrasado

    await toggle.execute({ ...base, itemKey: 'first_installment_paid', checked: true })

    expect(updateLead.execute).not.toHaveBeenCalled()
  })

  it('rejects an item from another funnel', async () => {
    const { toggle } = setup(POST_SALE)

    await expect(
      toggle.execute({ ...base, itemKey: 'docs_checked', checked: true }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('does not let a seller tick the ADM checklist', async () => {
    const { toggle, checklistRepository } = setup(ADM)

    await expect(
      toggle.execute({
        ...base,
        membership: { ...MANAGER, role: Role.SELLER },
        itemKey: 'docs_checked',
        checked: true,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError)
    expect(checklistRepository.check).not.toHaveBeenCalled()
  })
})
