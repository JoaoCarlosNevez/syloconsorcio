// Tests: resolveNotificationPreferences

import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  resolveNotificationPreferences,
} from './notification-preferences'

describe('resolveNotificationPreferences', () => {
  it('falls back to everything on when nothing is stored', () => {
    expect(resolveNotificationPreferences({})).toEqual(DEFAULT_NOTIFICATION_PREFERENCES)
    expect(resolveNotificationPreferences(null)).toEqual(DEFAULT_NOTIFICATION_PREFERENCES)
  })

  it('keeps stored values and fills in the missing ones', () => {
    expect(
      resolveNotificationPreferences({ push: { 'task.overdue': false }, sound: false }),
    ).toEqual({
      push: {
        'task.assigned': true,
        'task.due_soon': true,
        'task.overdue': false,
        'task.completed': true,
        'lead.received': true,
        'proposal.viewed': true,
      },
      sound: false,
    })
  })

  it('ignores invalid values', () => {
    expect(
      resolveNotificationPreferences({ push: { 'task.assigned': 'no', other: false }, sound: 1 }),
    ).toEqual(DEFAULT_NOTIFICATION_PREFERENCES)
  })
})
