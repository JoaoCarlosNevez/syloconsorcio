import { describe, expect, it } from 'vitest'
import { elapsedFraction, racePosition } from './race'

const START = '2026-09-28T03:00:00.000Z' // segunda 00h em Brasília
const END = '2026-10-05T03:00:00.000Z'

describe('elapsedFraction', () => {
  it('is 0 at the start, 0.5 mid-week and 1 at the end', () => {
    expect(elapsedFraction(START, END, Date.parse(START))).toBe(0)
    expect(elapsedFraction(START, END, Date.parse('2026-10-01T15:00:00.000Z'))).toBeCloseTo(0.5)
    expect(elapsedFraction(START, END, Date.parse(END))).toBe(1)
  })

  it('stays between 0 and 1', () => {
    expect(elapsedFraction(START, END, Date.parse('2026-10-10T00:00:00.000Z'))).toBe(1)
    expect(elapsedFraction(START, END, Date.parse('2026-09-01T00:00:00.000Z'))).toBe(0)
  })
})

describe('racePosition', () => {
  it('puts the leader where the week is', () => {
    expect(racePosition(10, 10, 0.6)).toBeCloseTo(0.6)
  })

  it('puts the others behind the leader, in proportion to their total', () => {
    expect(racePosition(5, 10, 0.6)).toBeCloseTo(0.3)
  })

  it('keeps everyone at the start with no activity', () => {
    expect(racePosition(0, 0, 0.9)).toBe(0)
    expect(racePosition(0, 4, 0.9)).toBe(0)
  })
})
