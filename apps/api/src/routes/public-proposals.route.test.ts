// Tests: publicProposalsRoute — GET /public/proposals/:token
//
// Sem autenticação: o token do link é o acesso. Conta a abertura e limita
// requisições por IP.

import type {
  ILeadProposalRepository,
  ILeadRepository,
  IOrganizationRepository,
  IUserRepository,
  LeadRecord,
  OrganizationRecord,
  SharedLeadProposalRecord,
} from '@sylocrm/application'
import { OrganizationType } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'
import { PUBLIC_PROPOSAL_RATE_LIMIT } from './public-proposals.route'

const TOKEN = 'abcdefghijklmnopqrstuvwxyz012345'

const PROPOSAL: SharedLeadProposalRecord = {
  id: 'proposal-01',
  leadId: 'lead-01',
  organizationId: 'org-01',
  downPaymentCents: 20_000_00,
  termMonths: 24,
  tableName: null,
  installments: [{ from: 1, to: 24, amountCents: 3_500_00 }],
  createdByUserId: 'user-01',
  shareToken: TOKEN,
  sharedByUserId: 'user-01',
  viewCount: 0,
  lastViewedAt: null,
  createdAt: new Date('2026-09-29T10:00:00Z'),
}

const LEAD = {
  id: 'lead-01',
  organizationId: 'org-01',
  name: 'Maria Silva',
  segment: 'Imobiliário',
  valueCents: 100_000_00,
  quotaCount: 1,
  funnelId: 'funnel-01',
  assignedUserId: null,
  cpf: '123.456.789-00',
} as LeadRecord

const ORGANIZATION = {
  id: 'org-01',
  name: 'Sylo Representações',
  type: OrganizationType.REPRESENTACAO,
  isWhiteLabel: false,
  branding: null,
} as OrganizationRecord

function buildTestApp(proposal: SharedLeadProposalRecord | null = PROPOSAL) {
  const leadProposalRepository = {
    findByShareToken: vi.fn().mockResolvedValue(proposal),
    recordView: vi.fn().mockResolvedValue(undefined),
  } as unknown as ILeadProposalRepository
  const app = buildApp({
    leadProposalRepository,
    leadRepository: { findById: vi.fn().mockResolvedValue(LEAD) } as unknown as ILeadRepository,
    organizationRepository: {
      findById: vi.fn().mockResolvedValue(ORGANIZATION),
    } as unknown as IOrganizationRepository,
    userRepository: { findById: vi.fn().mockResolvedValue(null) } as unknown as IUserRepository,
  })
  return { app, leadProposalRepository }
}

describe('GET /public/proposals/:token', () => {
  it('returns the proposal without authentication and records the view', async () => {
    const { app, leadProposalRepository } = buildTestApp()

    const response = await app.inject({ method: 'GET', url: `/public/proposals/${TOKEN}` })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      organization: { name: 'Sylo Representações' },
      client: { name: 'Maria Silva' },
      termMonths: 24,
    })
    expect(response.body).not.toContain('123.456.789-00')
    expect(leadProposalRepository.recordView).toHaveBeenCalledWith('proposal-01', expect.any(Date))
  })

  it('returns 404 for an unknown token', async () => {
    const { app } = buildTestApp(null)

    const response = await app.inject({ method: 'GET', url: `/public/proposals/${TOKEN}` })

    expect(response.statusCode).toBe(404)
  })

  it('returns 404 without hitting the database for a malformed token', async () => {
    const { app, leadProposalRepository } = buildTestApp()

    const response = await app.inject({ method: 'GET', url: '/public/proposals/x' })

    expect(response.statusCode).toBe(404)
    expect(leadProposalRepository.findByShareToken).not.toHaveBeenCalled()
  })

  it('rate limits by IP', async () => {
    const { app } = buildTestApp(null)

    for (let i = 0; i < PUBLIC_PROPOSAL_RATE_LIMIT.perIp; i++) {
      await app.inject({ method: 'GET', url: `/public/proposals/${TOKEN}` })
    }
    const response = await app.inject({ method: 'GET', url: `/public/proposals/${TOKEN}` })

    expect(response.statusCode).toBe(429)
  })
})
