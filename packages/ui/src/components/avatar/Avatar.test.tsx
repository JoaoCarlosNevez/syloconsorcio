import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('renders image when src is provided', () => {
    render(<Avatar src="https://example.com/photo.jpg" alt="John Doe" />)
    expect(screen.getByRole('img', { name: 'John Doe' })).toBeInTheDocument()
  })

  it('renders initials fallback when no src', () => {
    render(<Avatar initials="JD" alt="John Doe" />)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('renders ? when no src and no initials', () => {
    render(<Avatar />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('applies size class', () => {
    render(<Avatar initials="A" size="xl" />)
    const root = screen.getByText('A').parentElement
    expect(root?.className).toContain('xl')
  })

  it('applies sm size by default when size is sm', () => {
    render(<Avatar initials="B" size="sm" />)
    const root = screen.getByText('B').parentElement
    expect(root?.className).toContain('sm')
  })

  it('renders tier ring when tier is provided', () => {
    render(<Avatar initials="P" tier="platina" />)
    const root = screen.getByText('P').parentElement
    const ring = root?.querySelector('[aria-hidden="true"]')
    expect(ring?.className).toContain('platina')
  })

  it('does not render tier ring when no tier', () => {
    render(<Avatar initials="X" />)
    const root = screen.getByText('X').parentElement
    expect(root?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
  })

  it('renders status dot when showStatus is true', () => {
    render(<Avatar initials="S" showStatus />)
    const root = screen.getByText('S').parentElement
    const dots = root?.querySelectorAll('[aria-hidden="true"]')
    expect(dots?.length).toBeGreaterThanOrEqual(1)
  })
})
