// Tests: ficha de adesão — escopo do lead, vendedor membro ativo, log.

import { DataScope, OrganizationType, Role, ValidationError } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { MembershipContext } from '../auth/auth-context'
import type { IActivityLogRepository } from '../ports/activity-log.repository'
import type { ILeadAdhesionRepository, LeadAdhesionFields } from '../ports/lead-adhesion.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import { GetLeadAdhesionUseCase, SaveLeadAdhesionUseCase } from './lead-adhesion.use-cases'

const MEMBERSHIP: MembershipContext = {
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

const LEAD = { id: 'lead-01', organizationId: 'org-01', name: 'Maria' } as LeadRecord

const EMPTY_FIELDS: LeadAdhesionFields = {
  administrator: null,
  sellerUserId: null,
  assetValueCents: null,
  assetCode: null,
  planTable: null,
  assetType: null,
  groupCode: null,
  downPaymentCents: null,
  prepaidInstallments: null,
  birthplace: null,
  spouseName: null,
  phone2: null,
  address: null,
  zipCode: null,
  preferredAdministrator: null,
  contactHours: null,
  notes: null,
}

function setup(lead: LeadRecord | null = LEAD) {
  const leadRepository = {
    findById: vi.fn().mockResolvedValue(lead),
  } as unknown as ILeadRepository
  const organizationRepository = {
    findChildOrganizationIds: vi.fn().mockResolvedValue([]),
  } as unknown as IOrganizationRepository
  const membershipRepository = {
    findActiveByOrganizationId: vi.fn().mockResolvedValue([
      { userId: 'ana', status: 'ACTIVE' },
      { userId: 'saiu', status: 'SUSPENDED' },
    ]),
  } as unknown as IMembershipRepository
  const leadAdhesionRepository: ILeadAdhesionRepository = {
    findByLead: vi.fn().mockResolvedValue(null),
    upsert: vi.fn(async (input) => ({
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  }
  const activityLog: IActivityLogRepository = { record: vi.fn(), list: vi.fn() }
  return {
    get: new GetLeadAdhesionUseCase(leadRepository, organizationRepository, leadAdhesionRepository),
    save: new SaveLeadAdhesionUseCase(
      leadRepository,
      organizationRepository,
      membershipRepository,
      leadAdhesionRepository,
      activityLog,
    ),
    leadAdhesionRepository,
    activityLog,
  }
}

const access = { leadId: 'lead-01', userId: 'user-01', membership: MEMBERSHIP }

describe('lead adhesion', () => {
  it('returns null for a lead outside the scope', async () => {
    const { get, save, leadAdhesionRepository } = setup(null)

    expect(await get.execute(access)).toBeNull()
    expect(await save.execute({ ...access, fields: EMPTY_FIELDS })).toBeNull()
    expect(leadAdhesionRepository.upsert).not.toHaveBeenCalled()
  })

  it('returns no adhesion yet for a lead without one', async () => {
    const { get } = setup()

    expect(await get.execute(access)).toEqual({ adhesion: null })
  })

  it('saves the fields in the lead organization and logs how many were filled', async () => {
    const { save, leadAdhesionRepository, activityLog } = setup()

    await save.execute({
      ...access,
      fields: { ...EMPTY_FIELDS, administrator: 'Porto Seguro', sellerUserId: 'ana' },
    })

    expect(leadAdhesionRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 'lead-01',
        organizationId: 'org-01',
        updatedByUserId: 'user-01',
        administrator: 'Porto Seguro',
        sellerUserId: 'ana',
      }),
    )
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'lead.adhesion_updated',
        metadata: { filledFields: 2 },
      }),
    )
  })

  it('rejects a seller who is not an active member', async () => {
    const { save, leadAdhesionRepository } = setup()

    for (const sellerUserId of ['saiu', 'estranho']) {
      await expect(
        save.execute({ ...access, fields: { ...EMPTY_FIELDS, sellerUserId } }),
      ).rejects.toThrow(ValidationError)
    }
    expect(leadAdhesionRepository.upsert).not.toHaveBeenCalled()
  })
})
