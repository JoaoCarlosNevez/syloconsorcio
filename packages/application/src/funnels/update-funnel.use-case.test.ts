// Tests: UpdateFunnelUseCase — guarda de "não remover estágio com leads".

import { ValidationError } from '@sylocrm/domain'
import { describe, expect, it, vi } from 'vitest'
import type { FunnelRecord, IFunnelRepository } from '../ports/funnel.repository'
import { UpdateFunnelUseCase } from './update-funnel.use-case'

const ORG_ID = 'org-01'

const SAMPLE_FUNNEL: FunnelRecord = {
  id: 'funnel-01',
  organizationId: ORG_ID,
  name: 'Padrão',
  isDefault: true,
  duplicateToFunnelId: null,
  stages: [
    { id: 'stage-1', funnelId: 'funnel-01', name: 'Lead', color: '#000', position: 0 },
    { id: 'stage-2', funnelId: 'funnel-01', name: 'Fechado', color: '#000', position: 1 },
  ],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

const OTHER_FUNNEL: FunnelRecord = {
  ...SAMPLE_FUNNEL,
  id: 'funnel-02',
  name: 'Instalação',
  isDefault: false,
}

function buildFunnelRepository(overrides: Partial<IFunnelRepository> = {}): IFunnelRepository {
  return {
    listByOrganization: vi.fn().mockResolvedValue([SAMPLE_FUNNEL, OTHER_FUNNEL]),
    findById: vi.fn((id: string) => {
      if (id === OTHER_FUNNEL.id) return Promise.resolve(OTHER_FUNNEL)
      if (id === SAMPLE_FUNNEL.id) return Promise.resolve(SAMPLE_FUNNEL)
      return Promise.resolve(null)
    }),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue(SAMPLE_FUNNEL),
    delete: vi.fn(),
    countLeadsByStage: vi.fn().mockResolvedValue(0),
    countLeadsByFunnel: vi.fn(),
    ...overrides,
  }
}

describe('UpdateFunnelUseCase', () => {
  it('returns null when the funnel does not exist', async () => {
    const funnelRepository = buildFunnelRepository({ findById: vi.fn().mockResolvedValue(null) })
    const useCase = new UpdateFunnelUseCase(funnelRepository)

    const result = await useCase.execute({ id: 'missing', organizationId: ORG_ID, changes: {} })

    expect(result).toBeNull()
  })

  it('rejects an empty stages list', async () => {
    const useCase = new UpdateFunnelUseCase(buildFunnelRepository())

    await expect(
      useCase.execute({ id: 'funnel-01', organizationId: ORG_ID, changes: { stages: [] } }),
    ).rejects.toThrow(ValidationError)
  })

  it('rejects removing a stage that still has leads', async () => {
    const funnelRepository = buildFunnelRepository({
      countLeadsByStage: vi.fn().mockResolvedValue(3),
    })
    const useCase = new UpdateFunnelUseCase(funnelRepository)

    await expect(
      useCase.execute({
        id: 'funnel-01',
        organizationId: ORG_ID,
        // omite stage-2 (que tinha leads) da lista — equivale a removê-lo
        changes: { stages: [{ id: 'stage-1', name: 'Lead' }] },
      }),
    ).rejects.toThrow(ValidationError)
    expect(funnelRepository.update).not.toHaveBeenCalled()
  })

  it('allows removing a stage with no leads', async () => {
    const funnelRepository = buildFunnelRepository({
      countLeadsByStage: vi.fn().mockResolvedValue(0),
    })
    const useCase = new UpdateFunnelUseCase(funnelRepository)

    await useCase.execute({
      id: 'funnel-01',
      organizationId: ORG_ID,
      changes: { stages: [{ id: 'stage-1', name: 'Lead' }] },
    })

    expect(funnelRepository.update).toHaveBeenCalledWith(
      'funnel-01',
      ORG_ID,
      expect.objectContaining({ stages: [{ id: 'stage-1', name: 'Lead' }] }),
    )
  })

  it('rejects duplicateToFunnelId pointing to itself', async () => {
    const useCase = new UpdateFunnelUseCase(buildFunnelRepository())

    await expect(
      useCase.execute({
        id: 'funnel-01',
        organizationId: ORG_ID,
        changes: { duplicateToFunnelId: 'funnel-01' },
      }),
    ).rejects.toThrow(ValidationError)
  })

  it('rejects duplicateToFunnelId pointing to a funnel that does not exist', async () => {
    const useCase = new UpdateFunnelUseCase(buildFunnelRepository())

    await expect(
      useCase.execute({
        id: 'funnel-01',
        organizationId: ORG_ID,
        changes: { duplicateToFunnelId: 'missing-funnel' },
      }),
    ).rejects.toThrow(ValidationError)
  })

  it('accepts a valid duplicateToFunnelId', async () => {
    const funnelRepository = buildFunnelRepository()
    const useCase = new UpdateFunnelUseCase(funnelRepository)

    await useCase.execute({
      id: 'funnel-01',
      organizationId: ORG_ID,
      changes: { duplicateToFunnelId: 'funnel-02' },
    })

    expect(funnelRepository.update).toHaveBeenCalledWith(
      'funnel-01',
      ORG_ID,
      expect.objectContaining({ duplicateToFunnelId: 'funnel-02' }),
    )
  })

  it('allows clearing duplicateToFunnelId (null)', async () => {
    const funnelRepository = buildFunnelRepository()
    const useCase = new UpdateFunnelUseCase(funnelRepository)

    await useCase.execute({
      id: 'funnel-01',
      organizationId: ORG_ID,
      changes: { duplicateToFunnelId: null },
    })

    expect(funnelRepository.update).toHaveBeenCalledWith(
      'funnel-01',
      ORG_ID,
      expect.objectContaining({ duplicateToFunnelId: null }),
    )
  })

  it('allows adding a new stage (no id) without checking lead counts', async () => {
    const funnelRepository = buildFunnelRepository()
    const useCase = new UpdateFunnelUseCase(funnelRepository)

    await useCase.execute({
      id: 'funnel-01',
      organizationId: ORG_ID,
      changes: {
        stages: [
          { id: 'stage-1', name: 'Lead' },
          { id: 'stage-2', name: 'Fechado' },
          { name: 'Pós-venda' },
        ],
      },
    })

    expect(funnelRepository.update).toHaveBeenCalled()
  })
})
