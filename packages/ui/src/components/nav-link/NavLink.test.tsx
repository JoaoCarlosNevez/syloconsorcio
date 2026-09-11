import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NavLink } from './NavLink'

describe('NavLink', () => {
  it('renders label', () => {
    render(<NavLink label="Dashboard" href="/dashboard" />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('sets aria-current when active', () => {
    render(<NavLink label="Dashboard" href="/" active />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
  })

  it('does not set aria-current when inactive', () => {
    render(<NavLink label="Reports" href="/reports" />)
    expect(screen.getByRole('link', { name: 'Reports' })).not.toHaveAttribute('aria-current')
  })

  it('applies active class when active', () => {
    render(<NavLink label="Home" href="/" active />)
    expect(screen.getByRole('link').className).toContain('active')
  })

  it('renders icon slot', () => {
    render(<NavLink label="Home" href="/" icon={<span data-testid="nav-icon" />} />)
    expect(screen.getByTestId('nav-icon')).toBeInTheDocument()
  })

  it('renders badge slot', () => {
    render(<NavLink label="Inbox" href="/inbox" badge={<span>3</span>} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
