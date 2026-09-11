import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Switch } from './Switch'

describe('Switch', () => {
  it('renders with role switch', () => {
    render(<Switch />)
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('renders label', () => {
    render(<Switch label="Dark mode" />)
    expect(screen.getByLabelText('Dark mode')).toBeInTheDocument()
  })

  it('is unchecked by default', () => {
    render(<Switch label="Feature" />)
    expect(screen.getByRole('switch')).not.toBeChecked()
  })

  it('is checked when defaultChecked', () => {
    render(<Switch label="Feature" defaultChecked />)
    expect(screen.getByRole('switch')).toBeChecked()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Switch label="Disabled" disabled />)
    expect(screen.getByRole('switch')).toBeDisabled()
  })

  it('calls onChange when toggled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Switch label="Toggle" onChange={onChange} />)
    await user.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledOnce()
  })
})
