// Drizzle client factory — the single entry point to the database.
//
// ADR-02: Drizzle is the sole ORM. All database queries go through this client.
// Never import drizzle-orm outside of packages/infrastructure.
//
// No top-level side effects. The database connection is established
// only when createDatabase() is called with a valid config.
// This makes testing and dependency injection straightforward.

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

export type DatabaseConfig = {
  /** Full PostgreSQL connection string */
  url: string
  /** Maximum number of connections in the pool (default: 10) */
  maxConnections?: number
  /**
   * SSL mode (default: false for local Postgres).
   * Supabase requires 'require' — its certificate chain fails strict boolean verification.
   */
  ssl?: boolean | 'require'
}

export type Database = ReturnType<typeof createDatabase>

export function createDatabase(config: DatabaseConfig): ReturnType<typeof drizzle> {
  const client = postgres(config.url, {
    max: config.maxConnections ?? 10,
    ssl: config.ssl ?? false,
  })

  return drizzle(client)
}
