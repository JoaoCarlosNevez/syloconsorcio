// Tests: requirePlatformAdmin
//
//   401 quando authIdentity não está presente (authMiddleware não rodou)
//   403 quando o usuário não existe ou não tem a flag isPlatformAdmin
//   200 quando o usuário tem isPlatformAdmin = true

import type { AuthIdentity, IUserRepository } from '@sylocrm/application'
import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { AuthErrorCode } from '../auth/errors'
import { requirePlatformAdmin } from './platform-admin.middleware'

function buildTestApp(userRepository: IUserRepository, identity: AuthIdentity | undefined) {
  const app = Fastify({ logger: false })
  app.decorateRequest('authIdentity', undefined)
  app.decorateRequest('authContext', undefined)

  app.addHook('preHandler', async (request) => {
    request.authIdentity = identity
  })

  app.get('/organizations', { preHandler: [requirePlatformAdmin(userRepository)] }, async () => ({
    ok: true,
  }))

  return app
}

const IDENTITY: AuthIdentity = { id: 'user-uuid', email: 'admin@sylo.app' }

describe('requirePlatformAdmin', () => {
  it('returns 401 when authIdentity is not set', async () => {
    const userRepository: IUserRepository = {
      findById: vi.fn(),
      upsert: vi.fn(),
      updateProfile: vi.fn(),
    }
    const app = buildTestApp(userRepository, undefined)

    const response = await app.inject({ method: 'GET', url: '/organizations' })

    expect(response.statusCode).toBe(401)
    expect(userRepository.findById).not.toHaveBeenCalled()
  })

  it('returns 403 when the user is not a platform admin', async () => {
    const userRepository: IUserRepository = {
      findById: vi.fn().mockResolvedValue({
        id: IDENTITY.id,
        email: IDENTITY.email,
        name: null,
        isPlatformAdmin: false,
      }),
      upsert: vi.fn(),
      updateProfile: vi.fn(),
    }
    const app = buildTestApp(userRepository, IDENTITY)

    const response = await app.inject({ method: 'GET', url: '/organizations' })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.PERMISSION_DENIED)
  })

  it('returns 403 when the user does not exist in public.users', async () => {
    const userRepository: IUserRepository = {
      findById: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
      updateProfile: vi.fn(),
    }
    const app = buildTestApp(userRepository, IDENTITY)

    const response = await app.inject({ method: 'GET', url: '/organizations' })

    expect(response.statusCode).toBe(403)
  })

  it('allows the request through when isPlatformAdmin is true', async () => {
    const userRepository: IUserRepository = {
      findById: vi.fn().mockResolvedValue({
        id: IDENTITY.id,
        email: IDENTITY.email,
        name: null,
        isPlatformAdmin: true,
      }),
      upsert: vi.fn(),
      updateProfile: vi.fn(),
    }
    const app = buildTestApp(userRepository, IDENTITY)

    const response = await app.inject({ method: 'GET', url: '/organizations' })

    expect(response.statusCode).toBe(200)
  })
})
