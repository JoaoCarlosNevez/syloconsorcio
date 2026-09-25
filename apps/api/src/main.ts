// API entry point — loads env vars and starts the HTTP server.
// dotenv/config is imported first so process.env is populated before
// any other module reads it.
//
// This is the composition root: the only place that knows about Infrastructure.
// It creates the concrete adapters and injects them into the app factory.

import 'dotenv/config'
import {
  DrizzleActivityLogRepository,
  DrizzleFunnelRepository,
  DrizzleLeadProposalRepository,
  DrizzleLeadRepository,
  DrizzleMembershipRepository,
  DrizzleOrganizationRepository,
  DrizzleTaskRepository,
  DrizzleUserRepository,
  SupabaseAuthAdapter,
  SupabaseStorageAdapter,
  createDatabase,
} from '@sylocrm/infrastructure'
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

// Supabase's certificate chain fails strict SSL verification — 'require' encrypts
// the connection without validating the chain, which is Supabase's documented setup.
const database = env.DATABASE_URL
  ? createDatabase({ url: env.DATABASE_URL, ssl: 'require' })
  : undefined

const membershipRepository = database ? new DrizzleMembershipRepository(database) : undefined
const leadRepository = database ? new DrizzleLeadRepository(database) : undefined
const organizationRepository = database ? new DrizzleOrganizationRepository(database) : undefined
const userRepository = database ? new DrizzleUserRepository(database) : undefined
const funnelRepository = database ? new DrizzleFunnelRepository(database) : undefined
const leadProposalRepository = database ? new DrizzleLeadProposalRepository(database) : undefined
const taskRepository = database ? new DrizzleTaskRepository(database) : undefined
const activityLogRepository = database ? new DrizzleActivityLogRepository(database) : undefined

const storageProvider =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY
    ? new SupabaseStorageAdapter({
        supabaseUrl: env.SUPABASE_URL,
        supabaseServiceKey: env.SUPABASE_SERVICE_KEY,
      })
    : undefined

const app = buildApp({
  authProvider,
  membershipRepository,
  leadRepository,
  organizationRepository,
  userRepository,
  storageProvider,
  funnelRepository,
  leadProposalRepository,
  taskRepository,
  activityLogRepository,
})

try {
  await app.listen({ port: env.PORT, host: env.HOST })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
