// Tests: máscara de dinheiro dos campos de valor (criação/edição de lead).

import { describe, expect, it } from 'vitest'
import { centsToMoneyInput, formatMoneyInput, parseValueToCents } from './lead-adapters'

describe('formatMoneyInput', () => {
  it('fills from the cents, like banking apps', () => {
    expect(formatMoneyInput('5')).toBe('0,05')
    expect(formatMoneyInput('350')).toBe('3,50')
    expect(formatMoneyInput('35000000')).toBe('350.000,00')
    expect(formatMoneyInput('150000000')).toBe('1.500.000,00')
  })

  it('ignores non-digits and leading zeros', () => {
    expect(formatMoneyInput('R$ 1.234,56')).toBe('1.234,56')
    expect(formatMoneyInput('000123')).toBe('1,23')
    expect(formatMoneyInput('')).toBe('')
    expect(formatMoneyInput('abc')).toBe('')
  })

  it('round-trips through parseValueToCents', () => {
    expect(parseValueToCents(formatMoneyInput('35000050'))).toBe(35_000_050)
    expect(parseValueToCents(centsToMoneyInput(12_345_678))).toBe(12_345_678)
  })
})
