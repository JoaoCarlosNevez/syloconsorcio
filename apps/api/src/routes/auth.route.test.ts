// Tests: authRoute
//
// Verifica os contratos das rotas de autenticação:
//   GET  /auth/me     — retorna identidade quando token válido; 401 quando ausente
//   POST /auth/logout — retorna 200 sempre que autenticado; tolera falha do provider
//
// Usa buildApp() com authProvider mockado via DI — sem Supabase real.

import type { IAuthProvider } from '@sylocrm/application'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'
import { AuthErrorCode } from '../auth/errors'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_IDENTITY = { id: 'user-uuid', email: 'user@empresa.com' }

function buildTestApp(authProvider: IAuthProvider) {
  return buildApp({ authProvider })
}

// ── GET /auth/me ──────────────────────────────────────────────────────────────

describe('GET /auth/me', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when Authorization header is absent', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn(),
      signOut: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({ method: 'GET', url: '/auth/me' })

    expect(response.statusCode).toBe(401)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.TOKEN_MISSING)
  })

  it('returns 401 when token is invalid (provider returns null)', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(null),
      signOut: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer invalid-token' },
    })

    expect(response.statusCode).toBe(401)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.TOKEN_INVALID)
  })

  it('returns user identity when token is valid', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ id: string; email: string }>()
    expect(body.id).toBe(MOCK_IDENTITY.id)
    expect(body.email).toBe(MOCK_IDENTITY.email)
  })

  it('calls verifyToken with the raw token (without "Bearer " prefix)', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer my-jwt-token' },
    })

    expect(mockProvider.verifyToken).toHaveBeenCalledWith('my-jwt-token')
  })
})

// ── POST /auth/logout ─────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when Authorization header is absent', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn(),
      signOut: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({ method: 'POST', url: '/auth/logout' })

    expect(response.statusCode).toBe(401)
    const body = response.json<{ code: string }>()
    expect(body.code).toBe(AuthErrorCode.TOKEN_MISSING)
    expect(mockProvider.signOut).not.toHaveBeenCalled()
  })

  it('returns 200 and calls signOut when token is valid', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn().mockResolvedValue(undefined),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ message: string }>()
    expect(body.message).toBeTruthy()
    expect(mockProvider.signOut).toHaveBeenCalledWith('valid-token')
  })

  it('returns 200 even when signOut throws (graceful degradation)', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      signOut: vi.fn().mockRejectedValue(new Error('Supabase unreachable')),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: 'Bearer valid-token' },
    })

    // Server-side signOut failure must not break the client logout flow
    expect(response.statusCode).toBe(200)
  })

  it('returns 401 when token is invalid (provider returns null)', async () => {
    const mockProvider: IAuthProvider = {
      verifyToken: vi.fn().mockResolvedValue(null),
      signOut: vi.fn(),
    }
    const app = buildTestApp(mockProvider)

    const response = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: 'Bearer bad-token' },
    })

    expect(response.statusCode).toBe(401)
    expect(mockProvider.signOut).not.toHaveBeenCalled()
  })
})
