import { describe, expect, it, vi } from 'vitest'
import type {
  IPushOutboxRepository,
  IPushSender,
  IPushSubscriptionRepository,
  PendingPush,
} from '../ports/push.ports'
import { DispatchPushNotificationsUseCase } from './dispatch-push-notifications.use-case'
import { buildPushMessage } from './push-message'

const NOW = new Date('2026-10-29T15:00:00.000Z') // 12:00 em Brasília

function pending(overrides: Partial<PendingPush> = {}): PendingPush {
  return {
    id: 'n-1',
    userId: 'user-1',
    organizationId: 'org-1',
    type: 'lead.offered',
    title: 'Maria Silva',
    metadata: { leadId: 'lead-1', offerId: 'offer-1', expiresAt: '2026-10-29T15:05:00.000Z' },
    taskId: null,
    actorName: null,
    createdAt: NOW,
    preferences: {},
    ...overrides,
  }
}

function setup(items: PendingPush[], sendResult: 'sent' | 'gone' = 'sent') {
  const outbox: IPushOutboxRepository = {
    syncAllTaskReminders: vi.fn().mockResolvedValue(undefined),
    claimPending: vi.fn().mockResolvedValue(items),
  }
  const subscriptions: IPushSubscriptionRepository = {
    save: vi.fn(),
    remove: vi.fn(),
    removeByEndpoint: vi.fn().mockResolvedValue(undefined),
    listByUserIds: vi.fn().mockResolvedValue([
      { userId: 'user-1', endpoint: 'https://push/a', keys: { p256dh: 'p', auth: 'a' } },
      { userId: 'user-1', endpoint: 'https://push/b', keys: { p256dh: 'p', auth: 'a' } },
    ]),
  }
  const sender: IPushSender = { send: vi.fn().mockResolvedValue(sendResult) }
  const useCase = new DispatchPushNotificationsUseCase(outbox, subscriptions, sender)
  return { useCase, outbox, subscriptions, sender }
}

describe('DispatchPushNotificationsUseCase', () => {
  it('syncs reminders, claims the queue and pushes to every device of the recipient', async () => {
    const { useCase, outbox, sender } = setup([pending()])

    const result = await useCase.execute({ now: NOW })

    expect(outbox.syncAllTaskReminders).toHaveBeenCalled()
    expect(outbox.claimPending).toHaveBeenCalledWith({
      since: new Date(NOW.getTime() - 10 * 60 * 1000),
      limit: 200,
    })
    expect(sender.send).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ sent: 2, removedSubscriptions: 0 })
  })

  it('skips types the user turned off in the push preferences', async () => {
    const { useCase, sender, subscriptions } = setup([
      pending({ preferences: { push: { 'lead.offered': false } } }),
    ])

    const result = await useCase.execute({ now: NOW })

    expect(sender.send).not.toHaveBeenCalled()
    expect(subscriptions.listByUserIds).not.toHaveBeenCalled()
    expect(result.sent).toBe(0)
  })

  it('removes subscriptions the push service reports as gone', async () => {
    const { useCase, subscriptions } = setup([pending(), pending({ id: 'n-2' })], 'gone')

    const result = await useCase.execute({ now: NOW })

    expect(subscriptions.removeByEndpoint).toHaveBeenCalledWith('https://push/a')
    expect(subscriptions.removeByEndpoint).toHaveBeenCalledWith('https://push/b')
    expect(result).toEqual({ sent: 0, removedSubscriptions: 2 })
  })
})

describe('buildPushMessage', () => {
  it('opens the offer screen in the right organization', () => {
    expect(buildPushMessage(pending(), NOW)).toEqual({
      title: 'Novo lead pra você na fila',
      body: 'Maria Silva · Aceite até hoje às 12:05',
      url: '/m/oferta/offer-1?org=org-1',
      tag: 'n-1',
    })
  })

  it('opens the lead when the client viewed the proposal', () => {
    const message = buildPushMessage(
      pending({ type: 'proposal.viewed', metadata: { leadId: 'lead-9' } }),
      NOW,
    )
    expect(message.title).toBe('Cliente abriu a proposta')
    expect(message.url).toBe('/m/leads/lead-9?org=org-1')
  })

  it('formats task reminders in Brasília time and opens Tarefas', () => {
    const message = buildPushMessage(
      pending({
        type: 'task.overdue',
        title: 'Ligar pro Rafael',
        metadata: { dueAt: '2026-10-28T13:30:00.000Z' },
        taskId: 'task-1',
      }),
      NOW,
    )
    expect(message.body).toBe('Ligar pro Rafael · Venceu 28/10 às 10:30')
    expect(message.url).toBe('/m/tarefas?org=org-1')
  })
})
