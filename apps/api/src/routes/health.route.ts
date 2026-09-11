// Health check endpoint — infrastructure operational status.
// This is not a product feature. It exists to:
//   1. Allow load balancers and uptime monitors to verify the API is running
//   2. Provide a quick smoke test during local development and CI
//
// GET /health → 200 { status, timestamp, version }

import type { FastifyPluginAsync } from 'fastify'

const VERSION = process.env.npm_package_version ?? 'unknown'

export const healthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              version: { type: 'string' },
            },
            required: ['status', 'timestamp', 'version'],
          },
        },
      },
    },
    async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: VERSION,
    }),
  )
}
