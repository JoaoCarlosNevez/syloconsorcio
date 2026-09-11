import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('does not render when closed', () => {
    render(
      <Modal open={false} onClose={vi.fn()}>
        Content
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders when open', () => {
    render(
      <Modal open onClose={vi.fn()}>
        Content
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders title', () => {
    render(
      <Modal open onClose={vi.fn()} title="Confirm action">
        Content
      </Modal>,
    )
    expect(screen.getByText('Confirm action')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Test">
        Content
      </Modal>,
    )
    await user.click(screen.getByRole('button', { name: 'Fechar modal' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose}>
        Content
      </Modal>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders footer when provided', () => {
    render(
      <Modal open onClose={vi.fn()} footer={<button type="button">Confirm</button>}>
        Body
      </Modal>,
    )
    expect(screen.getByText('Confirm')).toBeInTheDocument()
  })

  it('has aria-modal attribute', () => {
    render(
      <Modal open onClose={vi.fn()}>
        Body
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })
})
