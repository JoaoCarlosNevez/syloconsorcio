// Tests: ListNotificationsUseCase

import { describe, expect, it, vi } from 'vitest'
import type { INotificationRepository } from '../ports/notification.repository'
import { ListNotificationsUseCase, TASK_DUE_SOON_WINDOW_MS } from './list-notifications.use-case'

function buildNotificationRepository(): INotificationRepository {
  return {
    notify: vi.fn(),
    syncTaskReminders: vi.fn(),
    list: vi.fn().mockResolvedValue({ items: [], unreadCount: 0 }),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  }
}

describe('ListNotificationsUseCase', () => {
  it('syncs the task reminders before listing', async () => {
    const notifications = buildNotificationRepository()
    const now = new Date('2026-02-01T12:00:00Z')
    const recipient = { userId: 'user-01', organizationId: 'org-01' }

    await new ListNotificationsUseCase(notifications).execute({ ...recipient, limit: 20, now })

    expect(notifications.syncTaskReminders).toHaveBeenCalledWith(recipient, {
      now,
      dueSoonWindowMs: TASK_DUE_SOON_WINDOW_MS,
    })
    expect(notifications.list).toHaveBeenCalledWith(recipient, 20)
    const syncOrder = vi.mocked(notifications.syncTaskReminders).mock.invocationCallOrder[0]
    const listOrder = vi.mocked(notifications.list).mock.invocationCallOrder[0]
    expect(syncOrder).toBeLessThan(listOrder as number)
  })
})
