// Tests: tier-art — só Vendedor tem patente; sem patente, fundo neutro.

import { describe, expect, it } from 'vitest'
import { tierBackground, visibleTier } from './tier-art'

describe('visibleTier', () => {
  it('returns the tier for a seller', () => {
    expect(visibleTier({ role: 'SELLER', tier: 'ouro' })).toBe('ouro')
  })

  it('returns null for owners and managers', () => {
    expect(visibleTier({ role: 'ADMIN', tier: 'ouro' })).toBeNull()
    expect(visibleTier({ role: 'MANAGER', tier: 'diamante' })).toBeNull()
  })
})

describe('tierBackground', () => {
  it('uses the tier art when there is one', () => {
    expect(tierBackground('diamante')).toContain('/tier-bg-diamante.webp')
  })

  it('falls back to a neutral gradient without a tier', () => {
    expect(tierBackground(null)).toContain('linear-gradient')
  })
})
