// Tests: deriveAccentTokens — tokens White Label sempre válidos e legíveis.

import { describe, expect, it } from 'vitest'
import { deriveAccentTokens } from './brand-theme'

const HEX = /^#[0-9a-f]{6}$/

describe('deriveAccentTokens', () => {
  it('returns null for an invalid color', () => {
    expect(deriveAccentTokens('azul')).toBeNull()
  })

  it.each(['#ffa705', '#005ecc', '#0b1c30', '#e11d48', '#10b981', '#fde047', '#ffffff', '#000000'])(
    'derives a valid gradient for %s',
    (color) => {
      const tokens = deriveAccentTokens(color)
      expect(tokens?.['--color-accent-gradient-from']).toMatch(HEX)
      expect(tokens?.['--color-accent-gradient-to']).toMatch(HEX)
      expect(tokens?.['--color-accent-gradient-from']).not.toBe(
        tokens?.['--color-accent-gradient-to'],
      )
    },
  )

  it('uses dark text on light colors and white text on dark colors', () => {
    expect(deriveAccentTokens('#ffa705')?.['--color-accent-contrast']).toBe('#0b1c30')
    expect(deriveAccentTokens('#fde047')?.['--color-accent-contrast']).toBe('#0b1c30')
    expect(deriveAccentTokens('#005ecc')?.['--color-accent-contrast']).toBe('#ffffff')
    expect(deriveAccentTokens('#0b1c30')?.['--color-accent-contrast']).toBe('#ffffff')
  })

  it('keeps the Sylo amber gradient close to the original #ffeab1 → #ffa705', () => {
    const tokens = deriveAccentTokens('#ffa705')
    expect(tokens?.['--color-accent-gradient-to']).toBe('#ffa705')
    expect(tokens?.['--color-accent-gradient-from']).toBe('#fdedb4')
  })

  it('keeps the accent text readable on white, darkening light colors', () => {
    expect(deriveAccentTokens('#005ecc')?.['--color-accent-text']).toBe('#005ecc')
    const yellowText = deriveAccentTokens('#fde047')?.['--color-accent-text']
    expect(yellowText).toMatch(HEX)
    expect(yellowText).not.toBe('#fde047')
  })
})
