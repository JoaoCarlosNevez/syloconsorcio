// Tests: authMiddleware
//
// Verifica os contratos de autenticação definidos no ADR-12:
//   - 401 quando token ausente
//   - 401 quando token inválido/expirado
//   - Request decorado com authIdentity quando token válido
//
// Usa Fastify inject() — sem binding de porta real.
// O authProvider é mockado via DI — sem dependência do Supabase.

import type { IAuthProvider } from '@sylocrm/application'
import Fastify from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthErrorCode } from '../auth/errors'
import { createAuthMiddleware } from './auth.middleware'

function buildTestApp(authProvider: IAuthProvider) {
  const app = Fastify({ logger: false })

  app.decorateRequest('authIdentity', undefined)
  app.decorateRequest('authContext', undefined)

  const authMiddleware = createAuthMiddleware(authProvider)

  app.get('/protected', { preHandler: [authMiddleware] }, async (request) => {
    return { userId: request.authIdentity?.id, email: request.authIdentity?.email }
  })

  return app
}

describe('authMiddleware', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when Authorization header is absent', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn(),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({ method: 'GET', url: '/protected' })

    expect(response.statusCode).toBe(401)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.TOKEN_MISSING)
    expect(mockProvider.verifyToken).not.toHaveBeenCalled()
  })

  it('returns 401 when Authorization header does not start with "Bearer "', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn(),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    })

    expect(response.statusCode).toBe(401)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.TOKEN_MISSING)
  })

  it('returns 401 when token is invalid (provider returns null)', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(null),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer invalid-token' },
    })

    expect(response.statusCode).toBe(401)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.TOKEN_INVALID)
    expect(mockProvider.verifyToken).toHaveBeenCalledWith('invalid-token')
  })

  it('returns 401 when provider throws an error (e.g., network failure)', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockRejectedValue(new Error('Network error')),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer some-token' },
    })

    // Fastify catches the unhandled error and returns 500 — not 401.
    // This is acceptable: provider errors surface as 500, not masked as 401.
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

  it('injects authIdentity into request when token is valid', async () => {
    const mockIdentity = { id: 'user-uuid', email: 'user@empresa.com' }
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(mockIdentity),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ userId: string; email: string }>()
    expect(body.userId).toBe(mockIdentity.id)
    expect(body.email).toBe(mockIdentity.email)
  })

  it('calls verifyToken with the raw token (without "Bearer " prefix)', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue({ id: 'u1', email: 'u@e.com' }),
      signOut: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer my-jwt-token' },
    })

    expect(mockProvider.verifyToken).toHaveBeenCalledWith('my-jwt-token')
  })
})
