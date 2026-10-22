// Tests: confirmação mensal do boleto no Pós-venda.

import { DataScope, OrganizationType, Role, ValidationError } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { MembershipContext } from '../auth/auth-context'
import type { IActivityLogRepository } from '../ports/activity-log.repository'
import type { FunnelRecord, IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadChecklistRepository } from '../ports/lead-checklist.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type {
  IPostSalePaymentRepository,
  PostSalePaymentLead,
} from '../ports/post-sale-payment.repository'
import type { ToggleLeadChecklistItemUseCase } from './lead-checklist.use-cases'
import {
  AnswerInstallmentPaymentUseCase,
  GeneratePostSalePaymentTasksUseCase,
  paymentTaskDay,
} from './post-sale-payments.use-cases'
import type { UpdateLeadUseCase } from './update-lead.use-case'

function paymentRepo(leads: PostSalePaymentLead[] = []): IPostSalePaymentRepository {
  return {
    listOpenLeadsWithDueDay: vi.fn().mockResolvedValue(leads),
    createAutoTask: vi.fn().mockResolvedValue(true),
    deleteOrphanAutoTasks: vi.fn().mockResolvedValue(0),
    findOpenAutoTasks: vi.fn().mockResolvedValue([]),
    completeTasks: vi.fn().mockResolvedValue(undefined),
  }
}

const LEAD: PostSalePaymentLead = {
  leadId: 'lead-01',
  organizationId: 'org-01',
  name: 'Maria',
  assignedUserId: 'ana',
  createdAt: new Date('2026-09-01T12:00:00Z'),
  dueDay: 10,
}

describe('paymentTaskDay', () => {
  it('is the day after the due date, at 00:00 in Brasília', () => {
    expect(paymentTaskDay(2026, 9, 10).toISOString()).toBe('2026-10-11T03:00:00.000Z')
  })

  it('clamps day 31 to the last day of a short month', () => {
    // Fevereiro/2027 tem 28 dias → vence dia 28, tarefa dia 1º/03.
    expect(paymentTaskDay(2027, 1, 31).toISOString()).toBe('2027-03-01T03:00:00.000Z')
  })
})

describe('GeneratePostSalePaymentTasksUseCase', () => {
  it('creates the month task on the day after the due date for the owner', async () => {
    const repo = paymentRepo([LEAD])
    const useCase = new GeneratePostSalePaymentTasksUseCase(repo)

    // 11/10, 08:00 em Brasília.
    const result = await useCase.execute({ now: new Date('2026-10-11T11:00:00Z') })

    expect(result.created).toBe(1)
    expect(repo.createAutoTask).toHaveBeenCalledWith({
      autoKey: 'post_sale_payment:lead-01:2026-10',
      organizationId: 'org-01',
      leadId: 'lead-01',
      assignedUserId: 'ana',
      title: 'Confirmar pagamento da parcela de outubro — Maria',
      notes: expect.stringContaining('todo dia 10'),
      dueAt: new Date('2026-10-11T12:00:00Z'),
    })
  })

  it('waits until the day after the due date', async () => {
    const repo = paymentRepo([LEAD])

    // 10/10, 23:00 em Brasília — ainda é dia do vencimento.
    await new GeneratePostSalePaymentTasksUseCase(repo).execute({
      now: new Date('2026-10-11T02:00:00Z'),
    })

    expect(repo.createAutoTask).not.toHaveBeenCalled()
  })

  it('starts next month when the card entered Pós-venda after this due date', async () => {
    const repo = paymentRepo([{ ...LEAD, createdAt: new Date('2026-10-12T12:00:00Z') }])

    await new GeneratePostSalePaymentTasksUseCase(repo).execute({
      now: new Date('2026-10-15T12:00:00Z'),
    })

    expect(repo.createAutoTask).not.toHaveBeenCalled()
  })

  it('skips cards without an owner and cleans orphan tasks', async () => {
    const repo = paymentRepo([{ ...LEAD, assignedUserId: null }])
    vi.mocked(repo.deleteOrphanAutoTasks).mockResolvedValue(2)

    const result = await new GeneratePostSalePaymentTasksUseCase(repo).execute({
      now: new Date('2026-10-15T12:00:00Z'),
    })

    expect(result).toEqual({ created: 0, removed: 2 })
    expect(repo.deleteOrphanAutoTasks).toHaveBeenCalledWith('post_sale_payment:')
  })
})

describe('AnswerInstallmentPaymentUseCase', () => {
  const MEMBERSHIP: MembershipContext = {
    organizationId: 'org-01',
    organizationType: OrganizationType.REPRESENTACAO,
    organizationName: 'Sylo',
    organizationIconUrl: null,
    organizationSecondaryColor: null,
    tier: 'bronze',
    role: Role.SELLER,
    dataScope: DataScope.OWN,
    permissions: [],
  }
  const STAGES = ['Boas-vindas', 'Aguardando 1º boleto', 'Em dia', 'Atrasado', 'Contemplado']
  const POST: FunnelRecord = {
    id: 'pos',
    organizationId: 'org-01',
    name: 'Pós-venda',
    isDefault: false,
    duplicateToFunnelId: null,
    kind: 'POST_SALE',
    stages: STAGES.map((name, position) => ({
      id: `s${position}`,
      funnelId: 'pos',
      name,
      color: '#000',
      position,
    })),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  function setup(stageId: string, checked: string[] = [], funnel: FunnelRecord = POST) {
    const repo = paymentRepo()
    vi.mocked(repo.findOpenAutoTasks).mockResolvedValue([
      { id: 'task-1', autoKey: 'post_sale_payment:lead-01:2026-10', title: 't', dueAt: new Date() },
    ])
    const leadRepository = {
      findById: vi.fn().mockResolvedValue({
        id: 'lead-01',
        organizationId: 'org-01',
        name: 'Maria',
        funnelId: funnel.id,
        stageId,
        wonAt: null,
        lostAt: null,
      }),
    } as unknown as ILeadRepository
    const checklistRepository = {
      listChecked: vi
        .fn()
        .mockResolvedValue(
          checked.map((itemKey) => ({ itemKey, checkedByUserId: 'ana', checkedAt: new Date() })),
        ),
    } as unknown as ILeadChecklistRepository
    const toggle = {
      execute: vi.fn().mockResolvedValue({}),
    } as unknown as ToggleLeadChecklistItemUseCase
    const updateLead = { execute: vi.fn().mockResolvedValue({}) } as unknown as UpdateLeadUseCase
    const activityLog: IActivityLogRepository = { record: vi.fn(), list: vi.fn() }
    const useCase = new AnswerInstallmentPaymentUseCase(
      leadRepository,
      { findChildOrganizationIds: vi.fn() } as unknown as IOrganizationRepository,
      { findById: vi.fn().mockResolvedValue(funnel) } as unknown as IFunnelRepository,
      repo,
      checklistRepository,
      toggle,
      updateLead,
      activityLog,
    )
    return { useCase, repo, toggle, updateLead, activityLog }
  }

  const answer = (paid: boolean) => ({
    leadId: 'lead-01',
    userId: 'ana',
    membership: MEMBERSHIP,
    paid,
    now: new Date('2026-10-11T15:00:00Z'),
  })

  it('"Pagou" completes the task and ticks the next installment', async () => {
    const { useCase, repo, toggle, activityLog } = setup('s2', ['first_installment_paid'])

    expect(await useCase.execute(answer(true))).toEqual({ completedTasks: 1 })

    expect(repo.completeTasks).toHaveBeenCalledWith(['task-1'], expect.any(Date))
    expect(toggle.execute).toHaveBeenCalledWith(
      expect.objectContaining({ itemKey: 'second_installment_paid', checked: true }),
    )
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'lead.installment_paid',
        metadata: { month: 'outubro/2026' },
      }),
    )
  })

  it('"Pagou" takes a late card back to "Em dia"', async () => {
    const { useCase, updateLead } = setup('s3', ['first_installment_paid'])

    await useCase.execute(answer(true))

    expect(updateLead.execute).toHaveBeenCalledWith(
      expect.objectContaining({ changes: { stageId: 's2' } }),
    )
  })

  it('"Não pagou" moves the card to "Atrasado"', async () => {
    const { useCase, updateLead, toggle, activityLog } = setup('s2')

    await useCase.execute(answer(false))

    expect(updateLead.execute).toHaveBeenCalledWith(
      expect.objectContaining({ changes: { stageId: 's3' } }),
    )
    expect(toggle.execute).not.toHaveBeenCalled()
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'lead.installment_late' }),
    )
  })

  it('only works in Pós-venda', async () => {
    const { useCase } = setup('s0', [], { ...POST, kind: 'BACKOFFICE' })

    await expect(useCase.execute(answer(true))).rejects.toBeInstanceOf(ValidationError)
  })
})
