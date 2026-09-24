// Tests: DeleteFunnelUseCase — as 3 guardas: único funil, funil padrão, funil com leads.

import { ValidationError } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { FunnelRecord, IFunnelRepository } from '../ports/funnel.repository'
import { DeleteFunnelUseCase } from './delete-funnel.use-case'

const ORG_ID = 'org-01'

const DEFAULT_FUNNEL: FunnelRecord = {
  id: 'funnel-default',
  organizationId: ORG_ID,
  name: 'Padrão',
  isDefault: true,
  duplicateToFunnelId: null,
  stages: [],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

const OTHER_FUNNEL: FunnelRecord = {
  id: 'funnel-other',
  organizationId: ORG_ID,
  name: 'Imobiliário',
  isDefault: false,
  duplicateToFunnelId: null,
  stages: [],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

function buildFunnelRepository(overrides: Partial<IFunnelRepository> = {}): IFunnelRepository {
  return {
    listByOrganization: vi.fn().mockResolvedValue([DEFAULT_FUNNEL, OTHER_FUNNEL]),
    findById: vi.fn().mockResolvedValue(OTHER_FUNNEL),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn().mockResolvedValue(true),
    countLeadsByStage: vi.fn(),
    countLeadsByFunnel: vi.fn().mockResolvedValue(0),
    ...overrides,
  }
}

describe('DeleteFunnelUseCase', () => {
  it('returns false when the funnel does not exist', async () => {
    const funnelRepository = buildFunnelRepository({ findById: vi.fn().mockResolvedValue(null) })
    const useCase = new DeleteFunnelUseCase(funnelRepository)

    const result = await useCase.execute({ id: 'missing', organizationId: ORG_ID })

    expect(result).toBe(false)
  })

  it('rejects deleting the only funnel of the organization', async () => {
    const funnelRepository = buildFunnelRepository({
      listByOrganization: vi.fn().mockResolvedValue([OTHER_FUNNEL]),
    })
    const useCase = new DeleteFunnelUseCase(funnelRepository)

    await expect(useCase.execute({ id: 'funnel-other', organizationId: ORG_ID })).rejects.toThrow(
      ValidationError,
    )
    expect(funnelRepository.delete).not.toHaveBeenCalled()
  })

  it('rejects deleting the default funnel', async () => {
    const funnelRepository = buildFunnelRepository({
      findById: vi.fn().mockResolvedValue(DEFAULT_FUNNEL),
    })
    const useCase = new DeleteFunnelUseCase(funnelRepository)

    await expect(useCase.execute({ id: 'funnel-default', organizationId: ORG_ID })).rejects.toThrow(
      ValidationError,
    )
    expect(funnelRepository.delete).not.toHaveBeenCalled()
  })

  it('rejects deleting a funnel that still has leads', async () => {
    const funnelRepository = buildFunnelRepository({
      countLeadsByFunnel: vi.fn().mockResolvedValue(5),
    })
    const useCase = new DeleteFunnelUseCase(funnelRepository)

    await expect(useCase.execute({ id: 'funnel-other', organizationId: ORG_ID })).rejects.toThrow(
      ValidationError,
    )
    expect(funnelRepository.delete).not.toHaveBeenCalled()
  })

  it('deletes a non-default, empty funnel when the org has more than one', async () => {
    const funnelRepository = buildFunnelRepository()
    const useCase = new DeleteFunnelUseCase(funnelRepository)

    const result = await useCase.execute({ id: 'funnel-other', organizationId: ORG_ID })

    expect(result).toBe(true)
    expect(funnelRepository.delete).toHaveBeenCalledWith('funnel-other', ORG_ID)
  })
})
