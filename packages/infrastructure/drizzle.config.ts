// Drizzle Kit configuration — generates and manages database migrations.
//
// Migration workflow (ADR-02):
//   1. Edit schema files in src/database/schema/
//   2. pnpm --filter @sylocrm/infrastructure db:generate
//   3. Review the generated SQL in src/database/migrations/
//   4. Apply: pnpm --filter @sylocrm/infrastructure db:push  (dev/staging)
//             supabase db push                                (production via Supabase CLI)
//
// RULE: Never alter the schema directly via Supabase Dashboard.
// All changes must originate from the TypeScript schema through this workflow.

import { defineConfig } from 'drizzle-kit'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required to run drizzle-kit commands.\n' +
      'Create a .env file in packages/infrastructure or set the variable in your environment.',
  )
}

export default defineConfig({
  schema: './src/database/schema/*.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
})
