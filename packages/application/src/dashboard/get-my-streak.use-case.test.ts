// Tests: ofensiva — dias seguidos no horário de Brasília, recorde e semana.

import { describe, expect, it } from 'vitest'
import { brasiliaDateKey, computeStreak } from './get-my-streak.use-case'

// Sexta, 02/10/2026, 15h em Brasília (18h UTC).
const NOW = new Date('2026-10-02T18:00:00Z')

describe('brasiliaDateKey', () => {
  it('uses the Brasília day, not UTC', () => {
    // 01h UTC do dia 3 ainda é 22h do dia 2 em Brasília.
    expect(brasiliaDateKey(new Date('2026-10-03T01:00:00Z'))).toBe('2026-10-02')
  })
})

describe('computeStreak', () => {
  it('counts consecutive days up to today', () => {
    const s = computeStreak(['2026-09-30', '2026-10-01', '2026-10-02'], NOW)
    expect(s).toMatchObject({ current: 3, todayDone: true })
  })

  it("keeps yesterday's streak alive while today has no activity yet", () => {
    const s = computeStreak(['2026-09-30', '2026-10-01'], NOW)
    expect(s).toMatchObject({ current: 2, todayDone: false })
  })

  it('resets after a whole day without activity', () => {
    const s = computeStreak(['2026-09-29', '2026-09-30'], NOW)
    expect(s.current).toBe(0)
  })

  it('keeps the longest run as the record', () => {
    const s = computeStreak(
      ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-10-01', '2026-10-02'],
      NOW,
    )
    expect(s).toMatchObject({ current: 2, record: 4 })
  })

  it('crosses month boundaries', () => {
    const s = computeStreak(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'], NOW)
    expect(s.current).toBe(4)
  })

  it('shows the current week from Monday to Sunday', () => {
    const s = computeStreak(['2026-09-28', '2026-09-30'], NOW)
    expect(s.week).toEqual([
      { date: '2026-09-28', status: 'done' },
      { date: '2026-09-29', status: 'missed' },
      { date: '2026-09-30', status: 'done' },
      { date: '2026-10-01', status: 'missed' },
      { date: '2026-10-02', status: 'today' },
      { date: '2026-10-03', status: 'future' },
      { date: '2026-10-04', status: 'future' },
    ])
  })

  it('is all zeros with no activity', () => {
    expect(computeStreak([], NOW)).toMatchObject({ current: 0, record: 0, todayDone: false })
  })
})
