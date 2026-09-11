import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Drawer } from './Drawer'

describe('Drawer', () => {
  it('does not render when closed', () => {
    render(
      <Drawer open={false} onClose={vi.fn()}>
        Content
      </Drawer>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders when open', () => {
    render(
      <Drawer open onClose={vi.fn()}>
        Content
      </Drawer>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders title', () => {
    render(
      <Drawer open onClose={vi.fn()} title="Filters">
        Content
      </Drawer>,
    )
    expect(screen.getByText('Filters')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose} title="Panel">
        Content
      </Drawer>,
    )
    await user.click(screen.getByRole('button', { name: 'Fechar painel' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose}>
        Content
      </Drawer>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('has aria-modal attribute', () => {
    render(
      <Drawer open onClose={vi.fn()}>
        Body
      </Drawer>,
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })
})
