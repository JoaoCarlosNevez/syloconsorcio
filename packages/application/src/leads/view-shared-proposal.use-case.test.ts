// Tests: ViewSharedProposalUseCase — abertura do link público da proposta:
// conta a abertura, avisa o vendedor (com intervalo mínimo entre avisos) e
// não expõe dados pessoais do cliente.

import { OrganizationType } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type {
  ILeadProposalRepository,
  SharedLeadProposalRecord,
} from '../ports/lead-proposal.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { INotificationRepository } from '../ports/notification.repository'
import type { IOrganizationRepository, OrganizationRecord } from '../ports/organization.repository'
import type { IUserRepository, UserRecord } from '../ports/user.repository'
import {
  VIEW_NOTIFICATION_COOLDOWN_MS,
  ViewSharedProposalUseCase,
} from './view-shared-proposal.use-case'

const NOW = new Date('2026-09-30T14:32:00Z')

const SHARED_PROPOSAL: SharedLeadProposalRecord = {
  id: 'proposal-01',
  leadId: 'lead-01',
  organizationId: 'org-01',
  downPaymentCents: 20_000_00,
  termMonths: 24,
  tableName: 'Tabela Imóvel 2026',
  installments: [{ from: 1, to: 24, amountCents: 3_500_00 }],
  shareToken: 'tok_abcdefghijklmnopqrstuvwx',
  sharedByUserId: 'user-sharer',
  viewCount: 0,
  lastViewedAt: null,
  createdAt: new Date('2026-09-29T10:00:00Z'),
}

const LEAD: LeadRecord = {
  id: 'lead-01',
  organizationId: 'org-01',
  name: 'Maria Silva',
  phone: '(11) 90000-0000',
  email: 'maria@email.com',
  segment: 'Imobiliário',
  valueCents: 100_000_00,
  quotaCount: 1,
  source: 'SITE',
  funnelId: 'funnel-01',
  stageId: 'stage-01',
  assignedUserId: 'user-seller',
  stageChangedAt: new Date('2026-01-01T00:00:00Z'),
  lostAt: null,
  wonAt: null,
  tags: [],
  notes: null,
  profession: 'Engenheira',
  incomeCents: 10_000_00,
  maritalStatus: 'Casado(a)',
  cpf: '123.456.789-00',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

const ORGANIZATION: OrganizationRecord = {
  id: 'org-01',
  name: 'Sylo Representações',
  type: OrganizationType.REPRESENTACAO,
  parentOrganizationId: null,
  isWhiteLabel: false,
  branding: { iconUrl: 'https://cdn.example/icon.png' },
  cnpj: null,
  phone: null,
  website: null,
  leadSegments: [],
  leadSources: [],
  leadTags: [],
  salesGoalCents: null,
}

const SELLER: UserRecord = {
  id: 'user-seller',
  email: 'ana@sylo.com',
  name: 'Ana Souza',
  instagramHandle: null,
  location: null,
  avatarUrl: null,
  isPlatformAdmin: false,
  notificationPreferences: {},
  createdAt: new Date('2026-01-01T00:00:00Z'),
}

function setup(
  overrides: {
    proposal?: SharedLeadProposalRecord | null
    lead?: LeadRecord | null
  } = {},
) {
  const leadProposalRepository: ILeadProposalRepository = {
    listByLead: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    enableSharing: vi.fn(),
    findByShareToken: vi
      .fn()
      .mockResolvedValue('proposal' in overrides ? overrides.proposal : SHARED_PROPOSAL),
    recordView: vi.fn().mockResolvedValue(undefined),
  }
  const leadRepository = {
    findById: vi.fn().mockResolvedValue('lead' in overrides ? overrides.lead : LEAD),
  } as unknown as ILeadRepository
  const organizationRepository = {
    findById: vi.fn().mockResolvedValue(ORGANIZATION),
  } as unknown as IOrganizationRepository
  const userRepository = {
    findById: vi.fn().mockResolvedValue(SELLER),
  } as unknown as IUserRepository
  const notifications: INotificationRepository = {
    notify: vi.fn().mockResolvedValue(undefined),
    syncTaskReminders: vi.fn(),
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  }
  const useCase = new ViewSharedProposalUseCase(
    leadProposalRepository,
    leadRepository,
    organizationRepository,
    userRepository,
    notifications,
  )
  return { useCase, leadProposalRepository, leadRepository, notifications }
}

describe('ViewSharedProposalUseCase', () => {
  it('returns null for an unknown token without recording anything', async () => {
    const { useCase, leadProposalRepository, notifications } = setup({ proposal: null })

    const result = await useCase.execute({ token: 'nope', now: NOW })

    expect(result).toBeNull()
    expect(leadProposalRepository.recordView).not.toHaveBeenCalled()
    expect(notifications.notify).not.toHaveBeenCalled()
  })

  it('looks the lead up inside the proposal organization', async () => {
    const { useCase, leadRepository } = setup()

    await useCase.execute({ token: 'tok', now: NOW })

    expect(leadRepository.findById).toHaveBeenCalledWith('lead-01', {
      organizationIds: ['org-01'],
    })
  })

  it('returns the proposal without the client personal data', async () => {
    const { useCase } = setup()

    const result = await useCase.execute({ token: 'tok', now: NOW })

    expect(result).toMatchObject({
      organization: { name: 'Sylo Representações', iconUrl: null },
      consultantName: 'Ana Souza',
      client: { name: 'Maria Silva' },
      valueCents: 100_000_00,
      downPaymentCents: 20_000_00,
      termMonths: 24,
      installments: [{ from: 1, to: 24, amountCents: 3_500_00 }],
    })
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain('123.456.789-00')
    expect(serialized).not.toContain('maria@email.com')
    expect(serialized).not.toContain('90000-0000')
  })

  it('records the view and notifies the lead owner', async () => {
    const { useCase, leadProposalRepository, notifications } = setup()

    await useCase.execute({ token: 'tok', now: NOW })

    expect(leadProposalRepository.recordView).toHaveBeenCalledWith('proposal-01', NOW)
    expect(notifications.notify).toHaveBeenCalledWith({
      organizationId: 'org-01',
      userId: 'user-seller',
      actorUserId: null,
      type: 'proposal.viewed',
      taskId: null,
      title: 'Maria Silva',
      metadata: {
        leadId: 'lead-01',
        funnelId: 'funnel-01',
        proposalId: 'proposal-01',
        viewedAt: NOW.toISOString(),
      },
    })
  })

  it('notifies whoever shared the link when the lead has no owner', async () => {
    const { useCase, notifications } = setup({ lead: { ...LEAD, assignedUserId: null } })

    await useCase.execute({ token: 'tok', now: NOW })

    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-sharer' }),
    )
  })

  it('counts but does not notify again when opened within the cooldown', async () => {
    const lastViewedAt = new Date(NOW.getTime() - VIEW_NOTIFICATION_COOLDOWN_MS + 60_000)
    const { useCase, leadProposalRepository, notifications } = setup({
      proposal: { ...SHARED_PROPOSAL, viewCount: 1, lastViewedAt },
    })

    await useCase.execute({ token: 'tok', now: NOW })

    expect(leadProposalRepository.recordView).toHaveBeenCalled()
    expect(notifications.notify).not.toHaveBeenCalled()
  })

  it('notifies again after the cooldown', async () => {
    const lastViewedAt = new Date(NOW.getTime() - VIEW_NOTIFICATION_COOLDOWN_MS - 60_000)
    const { useCase, notifications } = setup({
      proposal: { ...SHARED_PROPOSAL, viewCount: 1, lastViewedAt },
    })

    await useCase.execute({ token: 'tok', now: NOW })

    expect(notifications.notify).toHaveBeenCalledTimes(1)
  })
})
