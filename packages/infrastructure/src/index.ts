// Infrastructure package — adapters for all external systems.
//
// THIS IS THE ONLY PACKAGE ALLOWED TO IMPORT:
//   drizzle-orm, postgres, @supabase/supabase-js
//
// Structure:
//   database/       — Drizzle client, schema, repository implementations
//   auth/           — Supabase Auth adapter
//   storage/        — Supabase Storage adapter
//   observability/  — OpenTelemetry and error tracking ports

export { createDatabase } from './database/client'
export type { Database, DatabaseConfig } from './database/client'
export type { ErrorTracker, Logger, ObservabilityConfig } from './observability/ports'

// Auth
export { SupabaseAuthAdapter } from './auth/supabase-auth.adapter'
export type { SupabaseAuthConfig } from './auth/supabase-auth.adapter'

// Storage
export { SupabaseStorageAdapter } from './storage/supabase-storage.adapter'
export type { SupabaseStorageConfig } from './storage/supabase-storage.adapter'

// Database schema
export * from './database/schema'

// Repositories
export { DrizzleMembershipRepository } from './database/repositories/drizzle-membership.repository'
export { DrizzleOrganizationRepository } from './database/repositories/drizzle-organization.repository'
export { DrizzleLeadRepository } from './database/repositories/drizzle-lead.repository'
export { DrizzleLeadProposalRepository } from './database/repositories/drizzle-lead-proposal.repository'
export { DrizzleUserRepository } from './database/repositories/drizzle-user.repository'
export { DrizzleFunnelRepository } from './database/repositories/drizzle-funnel.repository'
export { DrizzleTaskRepository } from './database/repositories/drizzle-task.repository'
export { DrizzleActivityLogRepository } from './database/repositories/drizzle-activity-log.repository'
export { DrizzleNotificationRepository } from './database/repositories/drizzle-notification.repository'
