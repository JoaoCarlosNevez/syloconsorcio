import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Divider } from './Divider'

describe('Divider', () => {
  it('renders a separator', () => {
    render(<Divider />)
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('has horizontal orientation by default', () => {
    render(<Divider />)
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal')
  })

  it('renders vertical orientation', () => {
    render(<Divider orientation="vertical" />)
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical')
  })

  it('renders label text', () => {
    render(<Divider label="or" />)
    expect(screen.getByText('or')).toBeInTheDocument()
  })

  it('does not render label in vertical mode', () => {
    render(<Divider label="or" orientation="vertical" />)
    expect(screen.queryByText('or')).not.toBeInTheDocument()
  })
})
