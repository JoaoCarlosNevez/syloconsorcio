// Unit tests for GET /health
//
// Uses Fastify's built-in inject() to send requests without binding a real port.
// No external dependencies required — tests run in isolation.

import { type Database, pingDatabase } from '@sylocrm/infrastructure'
import { afterAll, describe, expect, it } from 'vitest'
import { buildApp } from '../app'

describe('GET /health', () => {
  const app = buildApp()

  afterAll(async () => {
    await app.close()
  })

  it('responds with status 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.statusCode).toBe(200)
  })

  it('returns status "ok"', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })
    const body = response.json<{ status: string }>()

    expect(body.status).toBe('ok')
  })

  it('returns a valid ISO 8601 timestamp', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })
    const body = response.json<{ timestamp: string }>()

    expect(body.timestamp).toBeDefined()
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
  })

  it('returns a version string', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })
    const body = response.json<{ version: string }>()

    expect(typeof body.version).toBe('string')
    expect(body.version.length).toBeGreaterThan(0)
  })
})

describe('GET /health with a database check', () => {
  it('responds 200 when the database answers', async () => {
    const app = buildApp({ checkDatabase: async () => {} })
    const response = await app.inject({ method: 'GET', url: '/health' })
    await app.close()

    expect(response.statusCode).toBe(200)
    expect(response.json<{ status: string }>().status).toBe('ok')
  })

  it('responds 503 when the database does not answer', async () => {
    const app = buildApp({
      checkDatabase: async () => {
        throw new Error('Banco não respondeu em 3000ms')
      },
    })
    const response = await app.inject({ method: 'GET', url: '/health' })
    await app.close()

    expect(response.statusCode).toBe(503)
    expect(response.json<{ status: string }>().status).toBe('error')
  })
})

describe('pingDatabase', () => {
  const fakeDatabase = (execute: () => Promise<unknown>): Database =>
    ({ execute }) as unknown as Database

  it('resolves when the database answers', async () => {
    await expect(
      pingDatabase(
        fakeDatabase(async () => [{ ok: 1 }]),
        50,
      ),
    ).resolves.toBeUndefined()
  })

  it('rejects when the database never answers', async () => {
    const stuck = fakeDatabase(() => new Promise(() => {}))
    await expect(pingDatabase(stuck, 20)).rejects.toThrow('Banco não respondeu em 20ms')
  })

  it('rejects when the query fails', async () => {
    const failing = fakeDatabase(async () => {
      throw new Error('connection closed')
    })
    await expect(pingDatabase(failing, 50)).rejects.toThrow('connection closed')
  })
})
