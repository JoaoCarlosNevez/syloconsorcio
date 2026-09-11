import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressCard } from './ProgressCard'

describe('ProgressCard', () => {
  it('renders title', () => {
    render(<ProgressCard title="Meta do time" value={60} />)
    expect(screen.getByText('Meta do time')).toBeInTheDocument()
  })

  it('renders progress bar', () => {
    render(<ProgressCard title="Meta" value={75} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75')
  })

  it('renders badge slot', () => {
    render(<ProgressCard title="Meta" value={50} badge={<span>Gold</span>} />)
    expect(screen.getByText('Gold')).toBeInTheDocument()
  })

  it('shows percentage value', () => {
    render(<ProgressCard title="Meta" value={42} showValue />)
    expect(screen.getByText('42%')).toBeInTheDocument()
  })
})
