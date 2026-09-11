import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('renders with correct aria attributes', () => {
    render(<ProgressBar value={60} label="Progress" />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '60')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('clamps value to 0', () => {
    render(<ProgressBar value={-10} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('clamps value to 100', () => {
    render(<ProgressBar value={150} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('renders label', () => {
    render(<ProgressBar value={50} label="Team" />)
    expect(screen.getByText('Team')).toBeInTheDocument()
  })

  it('renders value text when showValue is true', () => {
    render(<ProgressBar value={75} showValue />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('does not render header when no label and no showValue', () => {
    render(<ProgressBar value={50} />)
    expect(screen.queryByText('50%')).not.toBeInTheDocument()
  })
})
