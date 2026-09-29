// Tests: NotificationBell — onde o painel abre.
//
// placement="beside" (rodapé do menu lateral) vai num portal no <body>, ao
// lado do sininho; o padrão continua abrindo dentro do próprio componente.

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotificationBell } from './NotificationBell'

vi.mock('../../hooks/useOrganization', () => ({
  useActiveOrganization: () => ({ organizationId: 'org-01' }),
}))

vi.mock('../../hooks/useNotifications', () => ({
  useNotificationsQuery: () => ({
    data: { items: [], unreadCount: 3 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useMarkNotificationRead: () => ({ mutate: vi.fn() }),
  useMarkAllNotificationsRead: () => ({ mutate: vi.fn() }),
}))

function renderBell(props: Parameters<typeof NotificationBell>[0] = {}) {
  return render(
    <MemoryRouter>
      <div data-testid="container">
        <NotificationBell {...props} />
      </div>
    </MemoryRouter>,
  )
}

function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: 'Notificações (3 não lidas)' }))
  return screen.getByRole('dialog', { name: 'Notificações' })
}

afterEach(cleanup)

describe('NotificationBell', () => {
  it('opens the panel inside the component by default', () => {
    renderBell()

    const panel = openPanel()

    expect(screen.getByTestId('container').contains(panel)).toBe(true)
  })

  it('with placement="beside", opens the panel in a portal next to the bell', () => {
    renderBell({ placement: 'beside' })
    const trigger = screen.getByRole('button', { name: 'Notificações (3 não lidas)' })
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      left: 200,
      right: 238,
      top: 700,
      bottom: 738,
      width: 38,
      height: 38,
      x: 200,
      y: 700,
      toJSON: () => ({}),
    })
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(760)

    const panel = openPanel()

    expect(screen.getByTestId('container').contains(panel)).toBe(false)
    expect(panel.parentElement).toBe(document.body)
    expect(panel.style.left).toBe('250px')
    expect(panel.style.bottom).toBe('22px')
  })

  it('with placement="beside", keeps the panel open on clicks inside it and closes outside', () => {
    renderBell({ placement: 'beside' })
    const panel = openPanel()

    fireEvent.mouseDown(panel)
    expect(screen.queryByRole('dialog', { name: 'Notificações' })).not.toBeNull()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('dialog', { name: 'Notificações' })).toBeNull()
  })
})
