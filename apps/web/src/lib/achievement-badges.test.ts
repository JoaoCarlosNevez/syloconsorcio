import { describe, expect, it } from 'vitest'
import { toBadge } from './achievement-badges'

describe('toBadge', () => {
  it('shows the unlock date in Brasília', () => {
    const badge = toBadge({
      id: 'first_quota',
      title: 'Primeira cota',
      description: 'Vendeu a primeira cota.',
      unlockedAt: '2026-10-02T01:00:00.000Z',
      progress: null,
    })
    expect(badge).toMatchObject({ unlocked: true, date: '01/10/2026', progressText: null })
  })

  it('shows the progress of a locked sales milestone', () => {
    const badge = toBadge({
      id: 'sold_500k',
      title: '500K',
      description: 'Somou R$ 500 mil.',
      unlockedAt: null,
      progress: { currentCents: 400_000_00, targetCents: 500_000_00 },
    })
    expect(badge).toMatchObject({
      unlocked: false,
      date: null,
      progressText: 'R$ 400 mil de R$ 500 mil',
    })
  })
})
