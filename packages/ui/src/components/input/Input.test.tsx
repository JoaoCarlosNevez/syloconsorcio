import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('renders without label', () => {
    render(<Input placeholder="Type here" />)
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument()
  })

  it('renders label and associates it with input', () => {
    render(<Input label="Email" />)
    const label = screen.getByText('Email')
    const input = screen.getByRole('textbox')
    expect(label).toBeInTheDocument()
    expect(input).toHaveAttribute('id', 'email')
    expect(label).toHaveAttribute('for', 'email')
  })

  it('uses provided id over generated one', () => {
    render(<Input label="Email" id="custom-id" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'custom-id')
  })

  it('renders helper text', () => {
    render(<Input label="Name" helperText="Enter your full name" />)
    expect(screen.getByText('Enter your full name')).toBeInTheDocument()
  })

  it('renders error message and hides helper text', () => {
    render(<Input label="Name" helperText="Helper" errorMessage="Required field" />)
    expect(screen.getByText('Required field')).toBeInTheDocument()
    expect(screen.queryByText('Helper')).not.toBeInTheDocument()
  })

  it('sets aria-invalid when errorMessage is present', () => {
    render(<Input label="Name" errorMessage="Error" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not set aria-invalid without error', () => {
    render(<Input label="Name" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Input label="Name" disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('calls onChange when typing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    await user.type(screen.getByRole('textbox'), 'hello')
    expect(onChange).toHaveBeenCalled()
  })

  it('renders password toggle button', () => {
    render(<Input label="Password" type="password" passwordToggle />)
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toBeInTheDocument()
    // input[type='password'] is not a textbox role — query directly
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    render(<Input type="password" passwordToggle />)
    const toggle = screen.getByRole('button', { name: 'Mostrar senha' })
    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeInTheDocument()
  })

  it('renders leftIcon slot', () => {
    render(<Input leftIcon={<span data-testid="icon-left" />} />)
    expect(screen.getByTestId('icon-left')).toBeInTheDocument()
  })

  it('renders rightIcon slot', () => {
    render(<Input rightIcon={<span data-testid="icon-right" />} />)
    expect(screen.getByTestId('icon-right')).toBeInTheDocument()
  })
})
