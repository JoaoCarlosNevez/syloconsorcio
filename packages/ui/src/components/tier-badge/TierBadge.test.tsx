import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TierBadge } from './TierBadge'

describe('TierBadge', () => {
  it('renders Platina label', () => {
    render(<TierBadge tier="platina" />)
    expect(screen.getByText('Platina')).toBeInTheDocument()
  })

  it('renders Diamante label', () => {
    render(<TierBadge tier="diamante" />)
    expect(screen.getByText('Diamante')).toBeInTheDocument()
  })

  it('renders Rubi label', () => {
    render(<TierBadge tier="rubi" />)
    expect(screen.getByText('Rubi')).toBeInTheDocument()
  })

  it('renders Turmalina label', () => {
    render(<TierBadge tier="turmalina" />)
    expect(screen.getByText('Turmalina')).toBeInTheDocument()
  })

  it('applies tier class', () => {
    render(<TierBadge tier="platina" />)
    // getByText returns the badge span itself (text content = 'Platina')
    expect(screen.getByText('Platina').className).toContain('platina')
  })
})
