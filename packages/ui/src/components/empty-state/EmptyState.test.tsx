import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No results found" />)
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('renders description', () => {
    render(<EmptyState title="Empty" description="Try adjusting your filters" />)
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument()
  })

  it('renders action slot', () => {
    render(<EmptyState title="Empty" action={<button type="button">Add item</button>} />)
    expect(screen.getByText('Add item')).toBeInTheDocument()
  })

  it('renders icon slot', () => {
    render(<EmptyState title="Empty" icon={<span data-testid="icon" />} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    render(<EmptyState title="Empty" />)
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument()
  })
})
