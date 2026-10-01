import { describe, expect, it } from 'vitest'
import { formatCountdown } from './lead-queue-api'

describe('formatCountdown', () => {
  const now = Date.parse('2026-10-01T12:00:00Z')

  it('shows minutes and zero-padded seconds', () => {
    expect(formatCountdown('2026-10-01T12:04:05Z', now)).toBe('4:05')
  })

  it('rounds partial seconds up so it only hits 0:00 at the deadline', () => {
    expect(formatCountdown('2026-10-01T12:00:00.400Z', now)).toBe('0:01')
  })

  it('never goes negative', () => {
    expect(formatCountdown('2026-10-01T11:59:00Z', now)).toBe('0:00')
  })
})
