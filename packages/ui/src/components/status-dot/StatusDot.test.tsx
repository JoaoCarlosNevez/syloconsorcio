import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusDot } from './StatusDot'

describe('StatusDot', () => {
  it('renders with online status by default', () => {
    render(<StatusDot />)
    expect(screen.getByRole('status', { name: 'Online' })).toBeInTheDocument()
  })

  it('renders with busy status', () => {
    render(<StatusDot status="busy" />)
    expect(screen.getByRole('status', { name: 'Ocupado' })).toBeInTheDocument()
  })

  it('renders with offline status', () => {
    render(<StatusDot status="offline" />)
    expect(screen.getByRole('status', { name: 'Offline' })).toBeInTheDocument()
  })

  it('applies status class to dot', () => {
    render(<StatusDot status="online" />)
    const wrapper = screen.getByRole('status')
    const dot = wrapper.querySelector('[aria-hidden="true"]')
    expect(dot?.className).toContain('online')
  })

  it('applies pulse class when pulse is true', () => {
    render(<StatusDot pulse />)
    const wrapper = screen.getByRole('status')
    const dot = wrapper.querySelector('[aria-hidden="true"]')
    expect(dot?.className).toContain('pulse')
  })
})
