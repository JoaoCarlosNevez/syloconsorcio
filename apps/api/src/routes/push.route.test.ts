// Tests: pushRoute
//
// GET    /push/public-key    — chave VAPID pública (null = push desligado).
// POST   /push/subscriptions — inscreve o aparelho do usuário logado.
// DELETE /push/subscriptions — remove o aparelho do usuário logado.

import type { IAuthProvider, IPushSubscriptionRepository } from '@sylocrm/application'
import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'

const IDENTITY = { id: 'user-uuid', email: 'user@empresa.com' }
const AUTH = { authorization: 'Bearer valid-token' }
const SUBSCRIPTION = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'BPk', auth: 'xyz' },
}

function buildAuthProvider(): IAuthProvider {
  return {
    verifyToken: vi.fn().mockResolvedValue(IDENTITY),
    signOut: vi.fn(),
    createUser: vi.fn(),
    deleteUser: vi.fn(),
  }
}

function buildRepository(): IPushSubscriptionRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    removeByEndpoint: vi.fn(),
    listByUserIds: vi.fn(),
  }
}

describe('pushRoute', () => {
  it('returns the VAPID public key, or null when push is off', async () => {
    const on = buildApp({ authProvider: buildAuthProvider(), vapidPublicKey: 'BPUBLIC' })
    const off = buildApp({ authProvider: buildAuthProvider() })

    const onRes = await on.inject({ method: 'GET', url: '/push/public-key', headers: AUTH })
    const offRes = await off.inject({ method: 'GET', url: '/push/public-key', headers: AUTH })

    expect(onRes.json()).toEqual({ publicKey: 'BPUBLIC' })
    expect(offRes.json()).toEqual({ publicKey: null })
  })

  it('requires authentication', async () => {
    const app = buildApp({ authProvider: buildAuthProvider() })
    const response = await app.inject({ method: 'GET', url: '/push/public-key' })
    expect(response.statusCode).toBe(401)
  })

  it('saves the subscription for the logged-in user', async () => {
    const repository = buildRepository()
    const app = buildApp({
      authProvider: buildAuthProvider(),
      pushSubscriptionRepository: repository,
    })

    const response = await app.inject({
      method: 'POST',
      url: '/push/subscriptions',
      headers: { ...AUTH, 'user-agent': 'Mozilla/5.0 (iPhone)' },
      payload: SUBSCRIPTION,
    })

    expect(response.statusCode).toBe(204)
    expect(repository.save).toHaveBeenCalledWith({
      userId: IDENTITY.id,
      ...SUBSCRIPTION,
      userAgent: 'Mozilla/5.0 (iPhone)',
    })
  })

  it('rejects a subscription without keys', async () => {
    const repository = buildRepository()
    const app = buildApp({
      authProvider: buildAuthProvider(),
      pushSubscriptionRepository: repository,
    })

    const response = await app.inject({
      method: 'POST',
      url: '/push/subscriptions',
      headers: AUTH,
      payload: { endpoint: SUBSCRIPTION.endpoint },
    })

    expect(response.statusCode).toBe(400)
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('removes only the logged-in user subscription', async () => {
    const repository = buildRepository()
    const app = buildApp({
      authProvider: buildAuthProvider(),
      pushSubscriptionRepository: repository,
    })

    const response = await app.inject({
      method: 'DELETE',
      url: '/push/subscriptions',
      headers: AUTH,
      payload: { endpoint: SUBSCRIPTION.endpoint },
    })

    expect(response.statusCode).toBe(204)
    expect(repository.remove).toHaveBeenCalledWith(IDENTITY.id, SUBSCRIPTION.endpoint)
  })
})
