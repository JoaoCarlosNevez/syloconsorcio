import { describe, expect, it } from 'vitest'
import { currentWeekInBrasilia } from './current-week-in-brasilia'

describe('currentWeekInBrasilia', () => {
  it('goes from Monday 00:00 to the next Monday 00:00 in Brasília', () => {
    // Sexta, 02/10/2026, 15h em Brasília.
    expect(currentWeekInBrasilia(new Date('2026-10-02T18:00:00Z'))).toEqual({
      start: new Date('2026-09-28T03:00:00Z'),
      end: new Date('2026-10-05T03:00:00Z'),
    })
  })

  it('treats Sunday night in Brasília as the end of that week', () => {
    // Domingo 04/10, 23h em Brasília = segunda 02h UTC.
    expect(currentWeekInBrasilia(new Date('2026-10-05T02:00:00Z')).start).toEqual(
      new Date('2026-09-28T03:00:00Z'),
    )
  })

  it('starts a new week on Monday', () => {
    expect(currentWeekInBrasilia(new Date('2026-10-05T12:00:00Z')).start).toEqual(
      new Date('2026-10-05T03:00:00Z'),
    )
  })
})
