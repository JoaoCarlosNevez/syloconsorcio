import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies variant class', () => {
    const { rerender } = render(<Badge variant="amber">Amber</Badge>)
    expect(screen.getByText('Amber').className).toContain('amber')

    rerender(<Badge variant="blue">Blue</Badge>)
    expect(screen.getByText('Blue').className).toContain('blue')

    rerender(<Badge variant="green">Green</Badge>)
    expect(screen.getByText('Green').className).toContain('green')
  })

  it('defaults to slate variant', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default').className).toContain('slate')
  })

  it('renders dot when dot prop is true', () => {
    render(<Badge dot>With dot</Badge>)
    const badge = screen.getByText('With dot')
    // dot span is aria-hidden, check it exists in the badge element
    expect(badge.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('does not render dot by default', () => {
    render(<Badge>No dot</Badge>)
    const badge = screen.getByText('No dot')
    expect(badge.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument()
  })
})
