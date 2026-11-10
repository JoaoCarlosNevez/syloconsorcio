// Health check endpoint — infrastructure operational status.
// This is not a product feature. It exists to:
//   1. Allow load balancers and uptime monitors to verify the API is running
//   2. Provide a quick smoke test during local development and CI
//   3. Let the Docker Swarm healthcheck restart the container when the
//      database pool is stuck (requests hanging while the process stays up)
//
// GET /health → 200 { status: 'ok', timestamp, version }
//             → 503 { status: 'error', timestamp, version } when the database
//               does not answer

import type { FastifyPluginAsync } from 'fastify'

const VERSION = process.env.npm_package_version ?? 'unknown'

export type HealthRouteOptions = {
  /** Rejects when the database does not answer; omitted = no database check. */
  checkDatabase?: () => Promise<void>
}

const bodySchema = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    timestamp: { type: 'string' },
    version: { type: 'string' },
  },
  required: ['status', 'timestamp', 'version'],
} as const

export const healthRoute: FastifyPluginAsync<HealthRouteOptions> = async (fastify, opts) => {
  fastify.get(
    '/health',
    { schema: { response: { 200: bodySchema, 503: bodySchema } } },
    async (request, reply) => {
      const timestamp = new Date().toISOString()

      if (opts.checkDatabase) {
        try {
          await opts.checkDatabase()
        } catch (error) {
          request.log.error({ err: error }, 'health: database check failed')
          return reply.status(503).send({ status: 'error', timestamp, version: VERSION })
        }
      }

      return { status: 'ok', timestamp, version: VERSION }
    },
  )
}
