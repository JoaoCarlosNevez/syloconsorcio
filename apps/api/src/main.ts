// API entry point — loads env vars and starts the HTTP server.
// dotenv/config is imported first so process.env is populated before
// any other module reads it.
//
// This is the composition root: the only place that knows about Infrastructure.
// It creates the concrete adapters and injects them into the app factory.

import 'dotenv/config'
import { SupabaseAuthAdapter } from '@sylocrm/infrastructure'
import { buildApp } from './app'
import { env } from './config/env'

// Create infrastructure adapters when env vars are present
const authProvider =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY
    ? new SupabaseAuthAdapter({
        supabaseUrl: env.SUPABASE_URL,
        supabaseServiceKey: env.SUPABASE_SERVICE_KEY,
      })
    : undefined

const app = buildApp({ authProvider })

try {
  await app.listen({ port: env.PORT, host: env.HOST })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
