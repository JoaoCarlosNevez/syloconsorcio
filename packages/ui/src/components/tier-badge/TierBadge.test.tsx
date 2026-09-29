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

  it('renders Bronze label', () => {
    render(<TierBadge tier="bronze" />)
    expect(screen.getByText('Bronze')).toBeInTheDocument()
  })

  it('renders Ouro label', () => {
    render(<TierBadge tier="ouro" />)
    expect(screen.getByText('Ouro')).toBeInTheDocument()
  })

  it('applies tier class', () => {
    render(<TierBadge tier="platina" />)
    // getByText returns the badge span itself (text content = 'Platina')
    expect(screen.getByText('Platina').className).toContain('platina')
  })
})
