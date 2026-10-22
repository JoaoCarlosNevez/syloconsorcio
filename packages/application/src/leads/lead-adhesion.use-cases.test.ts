// Tests: ficha de adesão — escopo do lead, vendedor membro ativo, log.

import { DataScope, OrganizationType, Role, ValidationError } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { MembershipContext } from '../auth/auth-context'
import type { IActivityLogRepository } from '../ports/activity-log.repository'
import type { ILeadAdhesionRepository, LeadAdhesionFields } from '../ports/lead-adhesion.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { IMembershipRepository } from '../ports/membership.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { IStorageProvider } from '../ports/storage.provider'
import {
  DeleteAdhesionDocumentUseCase,
  GetLeadAdhesionUseCase,
  SaveLeadAdhesionUseCase,
  UploadAdhesionDocumentUseCase,
} from './lead-adhesion.use-cases'

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
  paymentMethod: null,
  installmentDueDay: null,
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
    listDocuments: vi.fn().mockResolvedValue([]),
    replaceDocument: vi.fn(async (input) => ({
      document: { ...input, id: 'doc-new', createdAt: new Date() },
      previous: null,
    })),
    deleteDocument: vi.fn().mockResolvedValue(null),
  }
  const storage: IStorageProvider = {
    uploadPublicFile: vi.fn(),
    deleteFolderFiles: vi.fn(),
    uploadPrivateFile: vi.fn().mockResolvedValue(undefined),
    copyFile: vi.fn().mockResolvedValue(undefined),
    createSignedUrl: vi.fn(),
    deleteFiles: vi.fn().mockResolvedValue(undefined),
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
    upload: new UploadAdhesionDocumentUseCase(
      leadRepository,
      organizationRepository,
      leadAdhesionRepository,
      storage,
      activityLog,
    ),
    remove: new DeleteAdhesionDocumentUseCase(
      leadRepository,
      organizationRepository,
      leadAdhesionRepository,
      storage,
      activityLog,
    ),
    leadAdhesionRepository,
    storage,
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

describe('adhesion documents', () => {
  const file = {
    kind: 'email_print',
    fileName: 'print.png',
    contentType: 'image/png',
    data: Buffer.from('png'),
  }

  it('stores the file in the private bucket inside the lead folder', async () => {
    const { upload, storage, activityLog } = setup()

    const document = await upload.execute({ ...access, ...file })

    expect(document?.kind).toBe('email_print')
    const [call] = vi.mocked(storage.uploadPrivateFile).mock.calls
    expect(call?.[0].bucket).toBe('lead-documents')
    expect(call?.[0].path).toMatch(/^org-01\/lead-01\/email_print-\d+\.png$/)
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'lead.document_uploaded',
        metadata: { kind: 'email_print' },
      }),
    )
  })

  it('removes the previous file of the same kind', async () => {
    const { upload, storage, leadAdhesionRepository } = setup()
    vi.mocked(leadAdhesionRepository.replaceDocument).mockImplementationOnce(async (input) => ({
      document: { ...input, id: 'doc-new', createdAt: new Date() },
      previous: {
        ...input,
        id: 'doc-old',
        storagePath: 'org-01/lead-01/old.png',
        createdAt: new Date(),
      },
    }))

    await upload.execute({ ...access, ...file })

    expect(storage.deleteFiles).toHaveBeenCalledWith({
      bucket: 'lead-documents',
      paths: ['org-01/lead-01/old.png'],
    })
  })

  it('rejects unknown kinds, unsupported types and oversized files', async () => {
    const { upload, storage } = setup()

    await expect(upload.execute({ ...access, ...file, kind: 'rg' })).rejects.toBeInstanceOf(
      ValidationError,
    )
    await expect(
      upload.execute({ ...access, ...file, contentType: 'text/html' }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      upload.execute({ ...access, ...file, data: Buffer.alloc(10 * 1024 * 1024 + 1) }),
    ).rejects.toBeInstanceOf(ValidationError)
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled()
  })

  it('does not upload for a lead outside the scope', async () => {
    const { upload, storage } = setup(null)

    expect(await upload.execute({ ...access, ...file })).toBeNull()
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled()
  })

  it('deletes the uploaded file when saving the record fails', async () => {
    const { upload, storage, leadAdhesionRepository } = setup()
    vi.mocked(leadAdhesionRepository.replaceDocument).mockRejectedValueOnce(new Error('db down'))

    await expect(upload.execute({ ...access, ...file })).rejects.toThrow('db down')
    expect(storage.deleteFiles).toHaveBeenCalledTimes(1)
  })

  it('returns false when deleting a document that is not from the lead', async () => {
    const { remove, storage } = setup()

    expect(await remove.execute({ ...access, documentId: 'doc-x' })).toBe(false)
    expect(storage.deleteFiles).not.toHaveBeenCalled()
  })
})
