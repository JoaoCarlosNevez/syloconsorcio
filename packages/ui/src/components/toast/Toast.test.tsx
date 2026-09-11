import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ToastType } from './Toast'
import { ToastProvider, useToast } from './Toast'

function ToastTrigger({ type = 'success', title = 'Done' }: { type?: ToastType; title?: string }) {
  const { toast } = useToast()
  return (
    <button type="button" onClick={() => toast({ type, title })}>
      Show
    </button>
  )
}

describe('Toast', () => {
  it('renders provider without crashing', () => {
    render(
      <ToastProvider>
        <div>App</div>
      </ToastProvider>,
    )
    expect(screen.getByText('App')).toBeInTheDocument()
  })

  it('shows toast when triggered', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ToastTrigger type="success" title="Saved!" />
      </ToastProvider>,
    )
    await user.click(screen.getByText('Show'))
    expect(screen.getByText('Saved!')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('dismisses toast when close button clicked', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ToastTrigger type="info" title="Hello" />
      </ToastProvider>,
    )
    await user.click(screen.getByText('Show'))
    expect(screen.getByText('Hello')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dispensar notificação' }))
    expect(screen.queryByText('Hello')).not.toBeInTheDocument()
  })

  it('throws if useToast used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ToastTrigger />)).toThrow()
    spy.mockRestore()
  })
})
