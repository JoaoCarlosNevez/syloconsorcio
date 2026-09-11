// Unit tests for GET /health
//
// Uses Fastify's built-in inject() to send requests without binding a real port.
// No external dependencies required — tests run in isolation.

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
