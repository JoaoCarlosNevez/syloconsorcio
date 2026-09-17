// Fastify application factory.
//
// buildApp() creates and configures the Fastify instance without starting it.
// This pattern makes the app testable (inject requests without binding a port)
// and allows multiple instances in tests if needed.
//
// deps: dependency injection for auth adapters. Optional — defaults to no-op
// adapters when Supabase env vars are not configured (development without credentials).

import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import type {
  IAuthProvider,
  ILeadRepository,
  IMembershipRepository,
  IOrganizationRepository,
  IStorageProvider,
  IUserRepository,
} from '@sylocrm/application'
import Fastify from 'fastify'
import { env } from './config/env'
import { authRoute } from './routes/auth.route'
import { healthRoute } from './routes/health.route'
import { leadsRoute } from './routes/leads.route'
import { organizationSettingsRoute } from './routes/organization-settings.route'
import { organizationsRoute } from './routes/organizations.route'
import { teamRoute } from './routes/team.route'

export interface BuildAppDeps {
  authProvider: IAuthProvider
  membershipRepository: IMembershipRepository
  leadRepository: ILeadRepository
  organizationRepository: IOrganizationRepository
  userRepository: IUserRepository
  storageProvider: IStorageProvider
}

/** No-op auth provider used when Supabase env vars are not configured. */
function createNoOpAuthProvider(): IAuthProvider {
  return {
    verifyToken: async () => null,
    signOut: async () => {},
    createUser: async () => {
      throw new Error('Auth provider not configured — cannot create users.')
    },
    deleteUser: async () => {
      throw new Error('Auth provider not configured — cannot delete users.')
    },
  }
}

/** No-op membership repository used when database is not configured. */
function createNoOpMembershipRepository(): IMembershipRepository {
  return {
    findActiveByUserId: async () => [],
    findActiveByUserAndOrganization: async () => null,
    findByUserAndOrganization: async () => null,
    findActiveByOrganizationId: async () => [],
    findByOrganizationId: async () => [],
    findAllActive: async () => [],
    findAll: async () => [],
    create: async () => {
      throw new Error('Database not configured — cannot create memberships.')
    },
    deactivate: async () => {
      throw new Error('Database not configured — cannot deactivate memberships.')
    },
    reactivate: async () => {
      throw new Error('Database not configured — cannot reactivate memberships.')
    },
    removeAllForUser: async () => {
      throw new Error('Database not configured — cannot remove memberships.')
    },
  }
}

/** No-op lead repository used when database is not configured. */
function createNoOpLeadRepository(): ILeadRepository {
  return {
    list: async (_filter, page, pageSize) => ({ items: [], total: 0, page, pageSize }),
    findById: async () => null,
    create: async () => {
      throw new Error('Database not configured — cannot create leads.')
    },
    update: async () => null,
    delete: async () => false,
    recordAssignmentChange: async () => {},
  }
}

/** No-op organization repository used when database is not configured. */
function createNoOpOrganizationRepository(): IOrganizationRepository {
  return {
    findChildOrganizationIds: async () => [],
    create: async () => {
      throw new Error('Database not configured — cannot create organizations.')
    },
    list: async () => [],
    findById: async () => null,
    update: async () => null,
  }
}

/** No-op user repository used when database is not configured. */
function createNoOpUserRepository(): IUserRepository {
  return {
    findById: async () => null,
    upsert: async () => {
      throw new Error('Database not configured — cannot upsert users.')
    },
    updateProfile: async () => {
      throw new Error('Database not configured — cannot update user profile.')
    },
  }
}

/** No-op storage provider used when Supabase env vars are not configured. */
function createNoOpStorageProvider(): IStorageProvider {
  return {
    uploadPublicFile: async () => {
      throw new Error('Storage provider not configured — cannot upload files.')
    },
  }
}

export function buildApp(deps?: Partial<BuildAppDeps>) {
  // Use provided deps or fall back to no-op adapters.
  // Real adapters are created in main.ts (composition root) from env vars.
  const resolvedDeps: BuildAppDeps = {
    authProvider: deps?.authProvider ?? createNoOpAuthProvider(),
    membershipRepository: deps?.membershipRepository ?? createNoOpMembershipRepository(),
    leadRepository: deps?.leadRepository ?? createNoOpLeadRepository(),
    organizationRepository: deps?.organizationRepository ?? createNoOpOrganizationRepository(),
    userRepository: deps?.userRepository ?? createNoOpUserRepository(),
    storageProvider: deps?.storageProvider ?? createNoOpStorageProvider(),
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

  // Limite do plugin fica ACIMA do limite de negócio (2MB, ver icon-validation.ts).
  // Se fossem iguais, um arquivo maior que 2MB seria truncado exatamente no limite
  // pelo @fastify/multipart em vez de disparar nosso erro real — a rota acabaria
  // aceitando um arquivo corrompido em silêncio.
  app.register(multipart, {
    limits: { fileSize: 6 * 1024 * 1024 },
  })

  // ── Routes ────────────────────────────────────────────────────────────────
  app.register(healthRoute)

  app.register(authRoute, {
    authProvider: resolvedDeps.authProvider,
    membershipRepository: resolvedDeps.membershipRepository,
    userRepository: resolvedDeps.userRepository,
    organizationRepository: resolvedDeps.organizationRepository,
    storageProvider: resolvedDeps.storageProvider,
  })

  app.register(leadsRoute, {
    authProvider: resolvedDeps.authProvider,
    membershipRepository: resolvedDeps.membershipRepository,
    leadRepository: resolvedDeps.leadRepository,
    organizationRepository: resolvedDeps.organizationRepository,
    userRepository: resolvedDeps.userRepository,
  })

  app.register(organizationsRoute, {
    authProvider: resolvedDeps.authProvider,
    userRepository: resolvedDeps.userRepository,
    organizationRepository: resolvedDeps.organizationRepository,
    membershipRepository: resolvedDeps.membershipRepository,
    storageProvider: resolvedDeps.storageProvider,
  })

  app.register(teamRoute, {
    authProvider: resolvedDeps.authProvider,
    userRepository: resolvedDeps.userRepository,
    membershipRepository: resolvedDeps.membershipRepository,
    organizationRepository: resolvedDeps.organizationRepository,
  })

  app.register(organizationSettingsRoute, {
    authProvider: resolvedDeps.authProvider,
    organizationRepository: resolvedDeps.organizationRepository,
    membershipRepository: resolvedDeps.membershipRepository,
    storageProvider: resolvedDeps.storageProvider,
    userRepository: resolvedDeps.userRepository,
  })

  return app
}
