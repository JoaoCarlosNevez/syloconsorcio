import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('renders without label', () => {
    render(<Checkbox />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('renders with label', () => {
    render(<Checkbox label="Accept terms" />)
    expect(screen.getByLabelText('Accept terms')).toBeInTheDocument()
  })

  it('is unchecked by default', () => {
    render(<Checkbox label="Option" />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('is checked when defaultChecked', () => {
    render(<Checkbox label="Option" defaultChecked />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Checkbox label="Option" disabled />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('calls onChange when clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox label="Option" onChange={onChange} />)
    await user.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('does not call onChange when disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox label="Option" disabled onChange={onChange} />)
    await user.click(screen.getByLabelText('Option'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('uses provided id', () => {
    render(<Checkbox id="my-checkbox" label="Option" />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'my-checkbox')
  })
})
