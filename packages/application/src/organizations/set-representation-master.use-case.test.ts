import { OrganizationType, ValidationError } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { IOrganizationRepository, OrganizationRecord } from '../ports/organization.repository'
import { SetRepresentationMasterUseCase } from './set-representation-master.use-case'

function org(id: string, type: OrganizationRecord['type']): OrganizationRecord {
  return {
    id,
    name: id,
    type,
    parentOrganizationId: null,
    isWhiteLabel: false,
    branding: null,
    cnpj: null,
    phone: null,
    website: null,
    leadSegments: [],
    leadSources: [],
    leadTags: [],
    salesGoalCents: null,
  }
}

function setup(orgs: OrganizationRecord[]) {
  const repository = {
    findById: vi.fn(async (id: string) => orgs.find((o) => o.id === id) ?? null),
    update: vi.fn(async (id: string, input: { parentOrganizationId?: string | null }) => ({
      ...(orgs.find((o) => o.id === id) as OrganizationRecord),
      parentOrganizationId: input.parentOrganizationId ?? null,
    })),
  }
  return {
    repository,
    useCase: new SetRepresentationMasterUseCase(repository as unknown as IOrganizationRepository),
  }
}

describe('SetRepresentationMasterUseCase', () => {
  const rep = org('rep', OrganizationType.REPRESENTACAO)
  const master = org('master', OrganizationType.MASTER)

  it('links a representação to a Master', async () => {
    const { useCase } = setup([rep, master])
    const result = await useCase.execute({ organizationId: 'rep', masterOrganizationId: 'master' })
    expect(result?.parentOrganizationId).toBe('master')
  })

  it('unlinks it (independent again)', async () => {
    const { useCase, repository } = setup([rep, master])
    await useCase.execute({ organizationId: 'rep', masterOrganizationId: null })
    expect(repository.update).toHaveBeenCalledWith('rep', { parentOrganizationId: null })
  })

  it('only a MASTER organization can be the parent', async () => {
    const other = org('other', OrganizationType.REPRESENTACAO)
    const { useCase, repository } = setup([rep, other])
    await expect(
      useCase.execute({ organizationId: 'rep', masterOrganizationId: 'other' }),
    ).rejects.toBeInstanceOf(ValidationError)
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('a Master cannot be put under another Master', async () => {
    const { useCase } = setup([master, org('m2', OrganizationType.MASTER)])
    await expect(
      useCase.execute({ organizationId: 'master', masterOrganizationId: 'm2' }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('returns null for an unknown organization', async () => {
    const { useCase } = setup([master])
    expect(
      await useCase.execute({ organizationId: 'nope', masterOrganizationId: 'master' }),
    ).toBeNull()
  })
})
