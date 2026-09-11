import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilterButton } from './FilterButton'

describe('FilterButton', () => {
  it('renders label', () => {
    render(<FilterButton>Filtros</FilterButton>)
    expect(screen.getByText('Filtros')).toBeInTheDocument()
  })

  it('sets aria-pressed when active', () => {
    render(<FilterButton active>Filtros</FilterButton>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('sets aria-pressed=false when inactive', () => {
    render(<FilterButton>Filtros</FilterButton>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders count badge when count > 0', () => {
    render(<FilterButton count={3}>Filtros</FilterButton>)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('does not render count badge when count is 0', () => {
    render(<FilterButton count={0}>Filtros</FilterButton>)
    expect(screen.queryByLabelText(/filtros ativos/)).not.toBeInTheDocument()
  })

  it('calls onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<FilterButton onClick={onClick}>Filter</FilterButton>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
