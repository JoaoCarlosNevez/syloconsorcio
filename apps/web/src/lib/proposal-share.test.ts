import { describe, expect, it } from 'vitest'
import { describeProposalViews } from './proposal-share'

const NOW = new Date(2026, 8, 30, 15, 0)

describe('describeProposalViews', () => {
  it('returns null while the link was never generated', () => {
    expect(describeProposalViews({ shareToken: null, viewCount: 0, lastViewedAt: null }, NOW)).toBe(
      null,
    )
  })

  it('says the link was not opened yet', () => {
    expect(
      describeProposalViews({ shareToken: 'tok', viewCount: 0, lastViewedAt: null }, NOW),
    ).toBe('Link gerado · ainda não aberto')
  })

  it('shows how many times and when it was last opened', () => {
    const lastViewedAt = new Date(2026, 8, 30, 14, 32).toISOString()
    expect(describeProposalViews({ shareToken: 'tok', viewCount: 3, lastViewedAt }, NOW)).toBe(
      'Cliente abriu 3 vezes · última hoje às 14:32',
    )
  })

  it('uses "ontem" for a view on the previous day', () => {
    const lastViewedAt = new Date(2026, 8, 29, 9, 5).toISOString()
    expect(describeProposalViews({ shareToken: 'tok', viewCount: 1, lastViewedAt }, NOW)).toBe(
      'Cliente abriu 1 vez · última ontem às 09:05',
    )
  })
})
