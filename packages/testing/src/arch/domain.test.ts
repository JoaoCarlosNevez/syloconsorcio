// Architecture test: Domain layer isolation
//
// The Domain must have ZERO production dependencies on external frameworks or infrastructure.
// pnpm strict isolation enforces this at the package manager level.
// These tests make violations explicit and fail CI before any code is merged.
//
// If this test fails, a prohibited dependency was added to packages/domain/package.json.
// Remove it and find an alternative that keeps the domain pure.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
// From packages/testing/src/arch/ → go up 4 levels to reach repo root
const repoRoot = resolve(__dirname, '../../../..')

type PackageJson = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

function readPackageJson(workspacePath: string): PackageJson {
  const fullPath = resolve(repoRoot, workspacePath, 'package.json')
  return JSON.parse(readFileSync(fullPath, 'utf-8')) as PackageJson
}

function getAllDeps(pkg: PackageJson): string[] {
  return [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ]
}

// Every package listed here is forbidden in packages/domain.
// If a new infrastructure or framework package is added to the project,
// add it here to keep the test up to date.
const PROHIBITED_IN_DOMAIN = [
  'drizzle-orm',
  'drizzle-kit',
  'postgres',
  'pg',
  '@supabase/supabase-js',
  'react',
  'react-dom',
  'fastify',
  'express',
  'hono',
  '@opentelemetry/sdk-node',
  '@opentelemetry/api',
  '@sentry/node',
  'dotenv',
  'zod',
]

describe('Architecture: @sylocrm/domain must be isolated from external dependencies', () => {
  const domainPkg = readPackageJson('packages/domain')
  const deps = getAllDeps(domainPkg)

  for (const prohibited of PROHIBITED_IN_DOMAIN) {
    it(`must not depend on "${prohibited}"`, () => {
      expect(deps, `Found prohibited dependency "${prohibited}" in packages/domain`).not.toContain(
        prohibited,
      )
    })
  }
})
