import { describe, expect, it } from 'vitest'
import { findNewNotifications } from './notification-alerts'
import type { AppNotification } from './notifications-api'

function notification(id: string, readAt: string | null = null): AppNotification {
  return {
    id,
    organizationId: 'org-01',
    type: 'task.assigned',
    actor: null,
    title: 'Ligar pro cliente',
    metadata: {},
    task: null,
    readAt,
    createdAt: '2026-09-29T10:00:00.000Z',
  }
}

describe('findNewNotifications', () => {
  it('alerts nothing on the first load', () => {
    expect(findNewNotifications(null, [notification('a'), notification('b')])).toEqual([])
  })

  it('returns only unread notifications that were not there before', () => {
    const items = [notification('a'), notification('b'), notification('c', '2026-09-29T10:01:00Z')]
    expect(findNewNotifications(new Set(['a']), items).map((n) => n.id)).toEqual(['b'])
  })
})
