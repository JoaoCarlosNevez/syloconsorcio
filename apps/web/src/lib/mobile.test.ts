import { describe, expect, it } from 'vitest'
import {
  groupTasks,
  hotLeads,
  mobileNotificationPath,
  parseMoneyToCents,
  phoneDigits,
  telLink,
  tomorrowAtTen,
  whatsappLink,
} from './mobile'
import type { AppNotification } from './notifications-api'

const NOW = new Date(2026, 9, 29, 12, 0, 0)

function notification(overrides: Partial<AppNotification>): AppNotification {
  return {
    id: 'n',
    organizationId: 'org',
    type: 'proposal.viewed',
    actor: null,
    title: 'Maria',
    metadata: {},
    task: null,
    readAt: null,
    createdAt: NOW.toISOString(),
    ...overrides,
  }
}

describe('phone links', () => {
  it('adds the Brazil country code to local numbers', () => {
    expect(phoneDigits('(11) 98765-4321')).toBe('5511987654321')
    expect(phoneDigits('+55 11 98765-4321')).toBe('5511987654321')
    expect(telLink('(11) 98765-4321')).toBe('tel:+5511987654321')
    expect(whatsappLink('11987654321', 'Oi Maria')).toBe(
      'https://wa.me/5511987654321?text=Oi%20Maria',
    )
  })
})

describe('parseMoneyToCents', () => {
  it('reads Brazilian formatted values', () => {
    expect(parseMoneyToCents('250.000')).toBe(25_000_000)
    expect(parseMoneyToCents('R$ 1.500,50')).toBe(150_050)
    expect(parseMoneyToCents('')).toBe(0)
  })
})

describe('groupTasks', () => {
  it('splits by overdue, today, tomorrow and later', () => {
    const at = (d: number, h: number) => new Date(2026, 9, d, h).toISOString()
    const groups = groupTasks(
      [{ dueAt: at(31, 9) }, { dueAt: at(29, 9) }, { dueAt: at(29, 15) }, { dueAt: at(30, 10) }],
      NOW,
    )
    expect(groups.atrasadas).toHaveLength(1)
    expect(groups.hoje).toHaveLength(1)
    expect(groups.amanha).toHaveLength(1)
    expect(groups.depois).toHaveLength(1)
  })
})

describe('hotLeads', () => {
  it('keeps one entry per lead, newest first, within the window', () => {
    const hours = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString()
    const result = hotLeads(
      [
        notification({ id: '1', metadata: { leadId: 'a' }, createdAt: hours(3) }),
        notification({ id: '2', metadata: { leadId: 'a' }, createdAt: hours(1), title: 'Ana' }),
        notification({ id: '3', metadata: { leadId: 'b' }, createdAt: hours(30) }),
        notification({ id: '4', type: 'task.overdue', metadata: { leadId: 'c' } }),
      ],
      NOW,
    )
    expect(result).toEqual([{ leadId: 'a', name: 'Ana', viewedAt: hours(1) }])
  })
})

describe('mobileNotificationPath', () => {
  it('routes each notification to the mobile screen', () => {
    expect(
      mobileNotificationPath(notification({ type: 'lead.offered', metadata: { offerId: 'o1' } })),
    ).toBe('/m/oferta/o1')
    expect(mobileNotificationPath(notification({ metadata: { leadId: 'l1' } }))).toBe('/m/leads/l1')
    expect(mobileNotificationPath(notification({ type: 'task.overdue' }))).toBe('/m/tarefas')
  })
})

describe('tomorrowAtTen', () => {
  it('is the next day at 10:00', () => {
    expect(tomorrowAtTen(NOW)).toEqual(new Date(2026, 9, 30, 10, 0, 0))
  })
})
