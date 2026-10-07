// Environment variable configuration — validated at startup.
// If required variables are missing or invalid, the process exits immediately.
// This prevents the API from starting in a misconfigured state.
//
// All variables have defaults so the API starts cleanly for local development
// without a .env file, with the exception of secrets which are always optional
// and cause specific features to be disabled when absent.

import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default('0.0.0.0'),
  // Um ou mais endereços do front, separados por vírgula.
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Infrastructure — optional until the database layer is wired up
  DATABASE_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),

  // Frontend URL for CORS (set in production to the Vercel URL)
  FRONTEND_URL: z.string().optional(),

  // Observability — optional, activates Sentry when present
  SENTRY_DSN: z.string().url().optional(),
})

const result = envSchema.safeParse(process.env)

if (!result.success) {
  console.error('[startup] Invalid environment variables:')
  console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2))
  process.exit(1)
}

export const env = result.data
export type Env = typeof env
