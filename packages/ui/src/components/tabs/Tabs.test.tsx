import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from './Tabs'

const ITEMS = [
  { key: 'a', label: 'Tab A', content: <div>Content A</div> },
  { key: 'b', label: 'Tab B', content: <div>Content B</div> },
  { key: 'c', label: 'Tab C', disabled: true, content: <div>Content C</div> },
]

describe('Tabs', () => {
  it('renders all tabs', () => {
    render(<Tabs items={ITEMS} activeKey="a" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Tab A' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Tab B' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Tab C' })).toBeInTheDocument()
  })

  it('marks active tab with aria-selected', () => {
    render(<Tabs items={ITEMS} activeKey="a" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Tab A' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Tab B' })).toHaveAttribute('aria-selected', 'false')
  })

  it('shows active content', () => {
    render(<Tabs items={ITEMS} activeKey="a" onChange={vi.fn()} />)
    expect(screen.getByText('Content A')).toBeInTheDocument()
    expect(screen.queryByText('Content B')).not.toBeInTheDocument()
  })

  it('calls onChange when tab clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Tabs items={ITEMS} activeKey="a" onChange={onChange} />)
    await user.click(screen.getByRole('tab', { name: 'Tab B' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('does not call onChange for disabled tab', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Tabs items={ITEMS} activeKey="a" onChange={onChange} />)
    await user.click(screen.getByRole('tab', { name: 'Tab C' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('navigates with arrow keys', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Tabs items={ITEMS} activeKey="a" onChange={onChange} />)
    screen.getByRole('tab', { name: 'Tab A' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('b')
  })
})
