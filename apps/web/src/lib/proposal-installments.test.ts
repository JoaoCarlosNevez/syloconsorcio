import { describe, expect, it } from 'vitest'
import {
  buildInstallmentRanges,
  describeInstallments,
  installmentRowStarts,
  totalInstallmentsCents,
} from './proposal-installments'

describe('buildInstallmentRanges', () => {
  it('uses a single row for the whole term', () => {
    expect(buildInstallmentRanges([{ until: '', amount: '1.500,00' }], 60)).toEqual({
      ok: true,
      ranges: [{ from: 1, to: 60, amountCents: 1_500_00 }],
    })
  })

  it('splits "1 até 12" and "the rest"', () => {
    const result = buildInstallmentRanges(
      [
        { until: '12', amount: '1.500,00' },
        { until: '', amount: '1.200,00' },
      ],
      60,
    )
    expect(result).toEqual({
      ok: true,
      ranges: [
        { from: 1, to: 12, amountCents: 1_500_00 },
        { from: 13, to: 60, amountCents: 1_200_00 },
      ],
    })
  })

  it('rejects a middle range that reaches the end of the term', () => {
    const result = buildInstallmentRanges(
      [
        { until: '60', amount: '1.500,00' },
        { until: '', amount: '1.200,00' },
      ],
      60,
    )
    expect(result.ok).toBe(false)
  })

  it('rejects a range that ends before it starts', () => {
    const result = buildInstallmentRanges(
      [
        { until: '12', amount: '1.500,00' },
        { until: '10', amount: '1.400,00' },
        { until: '', amount: '1.200,00' },
      ],
      60,
    )
    expect(result.ok).toBe(false)
  })

  it('rejects a missing amount', () => {
    expect(buildInstallmentRanges([{ until: '', amount: '' }], 60).ok).toBe(false)
  })
})

describe('installmentRowStarts', () => {
  it('starts each row right after the previous one', () => {
    expect(
      installmentRowStarts([
        { until: '12', amount: '' },
        { until: '24', amount: '' },
        { until: '', amount: '' },
      ]),
    ).toEqual([1, 13, 25])
  })
})

describe('describeInstallments / totalInstallmentsCents', () => {
  const ranges = [
    { from: 1, to: 12, amountCents: 1_500_00 },
    { from: 13, to: 13, amountCents: 1_000_00 },
  ]

  it('summarizes the ranges in one line', () => {
    expect(describeInstallments(ranges).replace(/\s/g, ' ')).toBe(
      '1ª a 12ª: R$ 1.500,00 · 13ª: R$ 1.000,00',
    )
  })

  it('sums every installment', () => {
    expect(totalInstallmentsCents(ranges)).toBe(12 * 1_500_00 + 1_000_00)
  })
})
