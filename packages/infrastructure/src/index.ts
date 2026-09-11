// Infrastructure package — adapters for all external systems.
//
// THIS IS THE ONLY PACKAGE ALLOWED TO IMPORT:
//   drizzle-orm, postgres, @supabase/supabase-js
//
// Structure:
//   database/       — Drizzle client, schema, repository implementations
//   auth/           — Supabase Auth adapter
//   storage/        — Supabase Storage adapter (not yet implemented)
//   observability/  — OpenTelemetry and error tracking ports

export { createDatabase } from './database/client'
export type { Database, DatabaseConfig } from './database/client'
export type { ErrorTracker, Logger, ObservabilityConfig } from './observability/ports'

// Auth
export { SupabaseAuthAdapter } from './auth/supabase-auth.adapter'
export type { SupabaseAuthConfig } from './auth/supabase-auth.adapter'

// Database schema
export * from './database/schema'

// Repositories
export { DrizzleMembershipRepository } from './database/repositories/drizzle-membership.repository'
