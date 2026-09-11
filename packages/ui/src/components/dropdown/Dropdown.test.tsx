import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Dropdown } from './Dropdown'

const ITEMS = [
  { key: 'edit', label: 'Edit', onSelect: vi.fn() },
  { key: 'sep', type: 'separator' as const },
  { key: 'delete', label: 'Delete', danger: true, onSelect: vi.fn() },
]

describe('Dropdown', () => {
  it('renders trigger', () => {
    render(<Dropdown trigger={<button type="button">Open</button>} items={ITEMS} />)
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('does not render menu initially', () => {
    render(<Dropdown trigger={<button type="button">Open</button>} items={ITEMS} />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens menu on trigger click', async () => {
    const user = userEvent.setup()
    render(<Dropdown trigger={<button type="button">Open</button>} items={ITEMS} />)
    await user.click(screen.getByText('Open'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('calls onSelect and closes on item click', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <Dropdown
        trigger={<button type="button">Open</button>}
        items={[{ key: 'edit', label: 'Edit', onSelect }]}
      />,
    )
    await user.click(screen.getByText('Open'))
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(onSelect).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes on Escape key', async () => {
    const user = userEvent.setup()
    render(<Dropdown trigger={<button type="button">Open</button>} items={ITEMS} />)
    await user.click(screen.getByText('Open'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
