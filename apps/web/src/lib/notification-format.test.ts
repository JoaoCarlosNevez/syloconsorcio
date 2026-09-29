import { describe, expect, it } from 'vitest'
import {
  describeNotification,
  notificationTarget,
  notificationTimeLabel,
  unreadBadgeLabel,
} from './notification-format'
import type { AppNotification } from './notifications-api'

const NOW = new Date(2026, 8, 28, 10, 0)

function notification(overrides: Partial<AppNotification>): AppNotification {
  return {
    id: 'n-01',
    organizationId: 'org-01',
    type: 'task.assigned',
    actor: { id: 'u-01', name: 'Maria Souza', email: 'maria@empresa.com', avatarUrl: null },
    title: 'Ligar pro cliente',
    metadata: {},
    task: null,
    readAt: null,
    createdAt: NOW.toISOString(),
    ...overrides,
  }
}

describe('describeNotification', () => {
  it('names who assigned the task and shows the deadline', () => {
    const text = describeNotification(
      notification({ metadata: { dueAt: new Date(2026, 8, 28, 14, 30).toISOString() } }),
      NOW,
    )
    expect(text.headline).toBe('Maria Souza atribuiu uma tarefa a você')
    expect(text.detail).toBe('Prazo: hoje às 14:30')
  })

  it("falls back to the actor's e-mail when there is no name", () => {
    const text = describeNotification(
      notification({
        actor: { id: 'u-01', name: '  ', email: 'maria@empresa.com', avatarUrl: null },
      }),
      NOW,
    )
    expect(text.headline).toBe('maria@empresa.com atribuiu uma tarefa a você')
    expect(text.detail).toBeNull()
  })

  it('describes due-soon and overdue reminders with the deadline', () => {
    const dueSoon = describeNotification(
      notification({
        type: 'task.due_soon',
        actor: null,
        metadata: { dueAt: new Date(2026, 8, 28, 10, 45).toISOString() },
      }),
      NOW,
    )
    expect(dueSoon).toEqual({ headline: 'Tarefa vence em breve', detail: 'Vence hoje às 10:45' })

    const overdue = describeNotification(
      notification({
        type: 'task.overdue',
        actor: null,
        metadata: { dueAt: new Date(2026, 8, 25, 9, 0).toISOString() },
      }),
      NOW,
    )
    expect(overdue).toEqual({ headline: 'Tarefa atrasada', detail: 'Venceu 25/09 às 09:00' })
  })

  it('labels tomorrow deadlines', () => {
    const text = describeNotification(
      notification({ metadata: { dueAt: new Date(2026, 8, 29, 8, 0).toISOString() } }),
      NOW,
    )
    expect(text.detail).toBe('Prazo: amanhã às 08:00')
  })

  it('describes a task completed by someone else', () => {
    expect(describeNotification(notification({ type: 'task.completed' }), NOW)).toEqual({
      headline: 'Maria Souza concluiu uma tarefa que você criou',
      detail: null,
    })
  })
})

describe('lead notifications', () => {
  const lead = notification({
    type: 'lead.received',
    actor: null,
    title: 'Maria Souza',
    metadata: {
      leadId: 'lead-01',
      funnelId: 'funnel-01',
      source: 'Landing page',
      assignedToYou: true,
    },
  })

  it('says whether the lead was assigned to the user and shows the source', () => {
    expect(describeNotification(lead, NOW)).toEqual({
      headline: 'Novo lead atribuído a você',
      detail: 'Origem: Landing page',
    })
    expect(
      describeNotification({ ...lead, metadata: { ...lead.metadata, assignedToYou: false } }, NOW)
        .headline,
    ).toBe('Novo lead recebido, sem responsável')
  })

  it('opens the lead in the Kanban, in its funnel', () => {
    expect(notificationTarget(lead)).toEqual({
      path: '/app/kanban',
      state: { openLeadId: 'lead-01', funnelId: 'funnel-01' },
    })
  })

  it('opens the task in Tarefas for task notifications', () => {
    expect(notificationTarget(notification({ task: null }))).toEqual({ path: '/app/tarefas' })
  })
})

describe('notificationTimeLabel', () => {
  it('uses relative labels for recent notifications and the date for older ones', () => {
    expect(notificationTimeLabel(new Date(2026, 8, 28, 9, 59, 40).toISOString(), NOW)).toBe('agora')
    expect(notificationTimeLabel(new Date(2026, 8, 28, 9, 45).toISOString(), NOW)).toBe('há 15 min')
    expect(notificationTimeLabel(new Date(2026, 8, 28, 7, 0).toISOString(), NOW)).toBe('há 3 h')
    expect(notificationTimeLabel(new Date(2026, 8, 26, 9, 0).toISOString(), NOW)).toBe('26/09')
  })
})

describe('unreadBadgeLabel', () => {
  it('hides the badge at zero and caps at 9+', () => {
    expect(unreadBadgeLabel(0)).toBeNull()
    expect(unreadBadgeLabel(3)).toBe('3')
    expect(unreadBadgeLabel(12)).toBe('9+')
  })
})
