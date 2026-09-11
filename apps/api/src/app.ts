// Fastify application factory.
//
// buildApp() creates and configures the Fastify instance without starting it.
// This pattern makes the app testable (inject requests without binding a port)
// and allows multiple instances in tests if needed.
//
// deps: dependency injection for auth adapters. Optional — defaults to no-op
// adapters when Supabase env vars are not configured (development without credentials).

import cors from '@fastify/cors'
import type { IAuthProvider, IMembershipRepository } from '@sylocrm/application'
import Fastify from 'fastify'
import { env } from './config/env'
import { authRoute } from './routes/auth.route'
import { healthRoute } from './routes/health.route'

export interface BuildAppDeps {
  authProvider: IAuthProvider
  membershipRepository: IMembershipRepository
}

/** No-op auth provider used when Supabase env vars are not configured. */
function createNoOpAuthProvider(): IAuthProvider {
  return {
    verifyToken: async () => null,
    signOut: async () => {},
  }
}

/** No-op membership repository used when database is not configured. */
function createNoOpMembershipRepository(): IMembershipRepository {
  return {
    findActiveByUserId: async () => [],
    findActiveByUserAndOrganization: async () => null,
  }
}

export function buildApp(deps?: Partial<BuildAppDeps>) {
  // Use provided deps or fall back to no-op adapters.
  // Real adapters are created in main.ts (composition root) from env vars.
  const resolvedDeps: BuildAppDeps = {
    authProvider: deps?.authProvider ?? createNoOpAuthProvider(),
    membershipRepository: deps?.membershipRepository ?? createNoOpMembershipRepository(),
  }

  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  })

  // Decorate request with auth properties (required for type safety)
  app.decorateRequest('authIdentity', undefined)
  app.decorateRequest('authContext', undefined)

  // ── Plugins ───────────────────────────────────────────────────────────────
  app.register(cors, {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })

  // ── Routes ────────────────────────────────────────────────────────────────
  app.register(healthRoute)

  app.register(authRoute, {
    authProvider: resolvedDeps.authProvider,
  })

  return app
}
