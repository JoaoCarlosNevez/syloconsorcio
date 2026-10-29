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
      progress: { current: 400_000_00, target: 500_000_00, unit: 'cents' },
    })
    expect(badge).toMatchObject({
      unlocked: false,
      date: null,
      progressText: 'R$ 400 mil de R$ 500 mil',
    })
  })

  it('shows the count progress of a back-office milestone', () => {
    const badge = toBadge({
      id: 'effective_10',
      title: '10 cotas efetivadas',
      description: 'Efetivou 10 cotas.',
      unlockedAt: null,
      progress: { current: 7, target: 10, unit: 'count' },
    })
    expect(badge).toMatchObject({ emoji: '📋', progressText: '7 de 10' })
  })
})
