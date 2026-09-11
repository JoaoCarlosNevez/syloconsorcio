// Architecture test: Application layer isolation
//
// The Application layer may only depend on @sylocrm/domain for internal packages.
// It must NOT directly depend on infrastructure packages, HTTP frameworks, or UI libraries.
//
// If this test fails, a prohibited dependency was added to packages/application/package.json.
// Use a port/interface from packages/domain instead of a direct dependency.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
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

function getProductionDeps(pkg: PackageJson): string[] {
  return Object.keys(pkg.dependencies ?? {})
}

// These packages are forbidden in packages/application production dependencies.
const PROHIBITED_IN_APPLICATION_PROD = [
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
  '@sentry/node',
  '@sylocrm/infrastructure',
  '@sylocrm/ui',
]

describe('Architecture: @sylocrm/application must not depend on infrastructure', () => {
  const appPkg = readPackageJson('packages/application')
  const prodDeps = getProductionDeps(appPkg)

  for (const prohibited of PROHIBITED_IN_APPLICATION_PROD) {
    it(`must not depend on "${prohibited}" in production`, () => {
      expect(
        prodDeps,
        `Found prohibited production dependency "${prohibited}" in packages/application`,
      ).not.toContain(prohibited)
    })
  }

  it('internal dependencies must only include @sylocrm/domain', () => {
    const internalProdDeps = prodDeps.filter((d) => d.startsWith('@sylocrm/'))
    const nonDomainInternal = internalProdDeps.filter((d) => d !== '@sylocrm/domain')
    expect(
      nonDomainInternal,
      `Application layer should only depend on @sylocrm/domain internally, found: ${nonDomainInternal.join(', ')}`,
    ).toEqual([])
  })
})
