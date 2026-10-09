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
  IActivityLogRepository,
  IApiKeyRepository,
  IAuthProvider,
  IFunnelRepository,
  ILeadProposalRepository,
  ILeadQueueRepository,
  ILeadRepository,
  IMembershipRepository,
  INotificationRepository,
  IOrganizationRepository,
  IStorageProvider,
  IStreakRepository,
  ITaskRepository,
  IUserRepository,
} from '@sylocrm/application'
import {
  DEFAULT_LEAD_QUEUE_TIMEOUT_MINUTES,
  NO_OP_ACTIVITY_LOG,
  NO_OP_NOTIFICATIONS,
} from '@sylocrm/application'
import Fastify from 'fastify'
import { env } from './config/env'
import { activityRoute } from './routes/activity.route'
import { apiKeysRoute } from './routes/api-keys.route'
import { authRoute } from './routes/auth.route'
import { dashboardRoute } from './routes/dashboard.route'
import { funnelsRoute } from './routes/funnels.route'
import { healthRoute } from './routes/health.route'
import { leadQueueRoute } from './routes/lead-queue.route'
import { leadsRoute } from './routes/leads.route'
import { notificationsRoute } from './routes/notifications.route'
import { organizationSettingsRoute } from './routes/organization-settings.route'
import { organizationsRoute } from './routes/organizations.route'
import { publicProposalsRoute } from './routes/public-proposals.route'
import { tasksRoute } from './routes/tasks.route'
import { teamRoute } from './routes/team.route'
import { webhooksRoute } from './routes/webhooks.route'

export interface BuildAppDeps {
  authProvider: IAuthProvider
  membershipRepository: IMembershipRepository
  leadRepository: ILeadRepository
  organizationRepository: IOrganizationRepository
  userRepository: IUserRepository
  storageProvider: IStorageProvider
  funnelRepository: IFunnelRepository
  leadProposalRepository: ILeadProposalRepository
  taskRepository: ITaskRepository
  activityLogRepository: IActivityLogRepository
  notificationRepository: INotificationRepository
  apiKeyRepository: IApiKeyRepository
  leadQueueRepository: ILeadQueueRepository
  streakRepository: IStreakRepository
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
    updateSalesGoal: async () => {
      throw new Error('Database not configured — cannot update sales goals.')
    },
    updateTier: async () => {
      throw new Error('Database not configured — cannot update member tiers.')
    },
    findPersonalGoal: async () => null,
    updatePersonalGoal: async () => {
      throw new Error('Database not configured — cannot update personal goals.')
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
    listAssignmentHistory: async () => [],
    listComments: async () => [],
    createComment: async () => {
      throw new Error('Database not configured — cannot create comments.')
    },
    findByPhone: async () => null,
    sumWonValueCentsInDefaultFunnel: async () => 0,
    countWonInDefaultFunnel: async () => 0,
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
    listPlatformAdmins: async () => [],
  }
}

/** No-op storage provider used when Supabase env vars are not configured. */
function createNoOpStorageProvider(): IStorageProvider {
  return {
    deleteFolderFiles: async () => {},
    uploadPublicFile: async () => {
      throw new Error('Storage provider not configured — cannot upload files.')
    },
  }
}

/** No-op funnel repository used when database is not configured. */
function createNoOpFunnelRepository(): IFunnelRepository {
  return {
    listByOrganization: async () => [],
    findById: async () => null,
    create: async () => {
      throw new Error('Database not configured — cannot create funnels.')
    },
    update: async () => null,
    delete: async () => false,
    countLeadsByStage: async () => 0,
    countLeadsByFunnel: async () => 0,
  }
}

/** No-op lead proposal repository used when database is not configured. */
function createNoOpLeadProposalRepository(): ILeadProposalRepository {
  return {
    listByLead: async () => [],
    create: async () => {
      throw new Error('Database not configured — cannot create lead proposals.')
    },
    findById: async () => null,
    enableSharing: async () => {
      throw new Error('Database not configured — cannot share lead proposals.')
    },
    findByShareToken: async () => null,
    recordView: async () => {},
  }
}

/** No-op task repository used when database is not configured. */
function createNoOpTaskRepository(): ITaskRepository {
  return {
    list: async (_filter, page, pageSize) => ({ items: [], total: 0, page, pageSize }),
    findById: async () => null,
    create: async () => {
      throw new Error('Database not configured — cannot create tasks.')
    },
    update: async () => null,
    delete: async () => false,
    count: async () => 0,
  }
}

/** No-op API key repository used when database is not configured. */
function createNoOpApiKeyRepository(): IApiKeyRepository {
  return {
    create: async () => {
      throw new Error('Database not configured — cannot create API keys.')
    },
    listActiveByOrganization: async () => [],
    revoke: async () => false,
    findActiveByHash: async () => null,
    markUsed: async () => {},
  }
}

/** No-op lead queue repository used when database is not configured — a fila
 * fica sempre desligada. */
function createNoOpLeadQueueRepository(): ILeadQueueRepository {
  return {
    getSettings: async (organizationId) => ({
      organizationId,
      enabled: false,
      timeoutMinutes: DEFAULT_LEAD_QUEUE_TIMEOUT_MINUTES,
      memberUserIds: [],
    }),
    saveSettings: async () => {
      throw new Error('Database not configured — cannot save the lead queue.')
    },
    listQueue: async () => [],
    markOffered: async () => {},
    listOfferedUserIds: async () => [],
    createOffer: async () => {
      throw new Error('Database not configured — cannot create lead offers.')
    },
    findOffer: async () => null,
    resolveOffer: async () => null,
    claimExpiredOffers: async () => [],
    listPendingOffers: async () => [],
  }
}

/** Front do Vite (porta 5173) aberto por um IP de rede local/privada. */
function isLocalNetworkDevOrigin(origin: string): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}):5173$/.test(
    origin,
  )
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
    funnelRepository: deps?.funnelRepository ?? createNoOpFunnelRepository(),
    leadProposalRepository: deps?.leadProposalRepository ?? createNoOpLeadProposalRepository(),
    taskRepository: deps?.taskRepository ?? createNoOpTaskRepository(),
    activityLogRepository: deps?.activityLogRepository ?? NO_OP_ACTIVITY_LOG,
    notificationRepository: deps?.notificationRepository ?? NO_OP_NOTIFICATIONS,
    apiKeyRepository: deps?.apiKeyRepository ?? createNoOpApiKeyRepository(),
    leadQueueRepository: deps?.leadQueueRepository ?? createNoOpLeadQueueRepository(),
    // Sem banco, ninguém tem ofensiva.
    streakRepository: deps?.streakRepository ?? { listActiveDays: async () => [] },
  }

  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
    trustProxy: env.TRUST_PROXY,
  })

  // Decorate request with auth properties (required for type safety)
  app.decorateRequest('authIdentity', undefined)
  app.decorateRequest('authContext', undefined)

  // ── Plugins ───────────────────────────────────────────────────────────────
  // CORS_ORIGIN aceita vários endereços separados por vírgula. Em
  // desenvolvimento também libera o front aberto pelo IP da rede local
  // (celular/outro PC acessando o Vite da máquina na porta 5173).
  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  app.register(cors, {
    origin: (origin, callback) => {
      // Sem Origin = chamada fora do navegador (curl, webhook, outro servidor).
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
      if (env.NODE_ENV === 'development' && isLocalNetworkDevOrigin(origin)) {
        return callback(null, true)
      }
      callback(null, false)
    },
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
    funnelRepository: resolvedDeps.funnelRepository,
    leadProposalRepository: resolvedDeps.leadProposalRepository,
    activityLogRepository: resolvedDeps.activityLogRepository,
  })

  app.register(leadQueueRoute, {
    authProvider: resolvedDeps.authProvider,
    membershipRepository: resolvedDeps.membershipRepository,
    organizationRepository: resolvedDeps.organizationRepository,
    userRepository: resolvedDeps.userRepository,
    leadRepository: resolvedDeps.leadRepository,
    leadQueueRepository: resolvedDeps.leadQueueRepository,
    notificationRepository: resolvedDeps.notificationRepository,
  })

  app.register(publicProposalsRoute, {
    leadProposalRepository: resolvedDeps.leadProposalRepository,
    leadRepository: resolvedDeps.leadRepository,
    organizationRepository: resolvedDeps.organizationRepository,
    userRepository: resolvedDeps.userRepository,
    notificationRepository: resolvedDeps.notificationRepository,
  })

  app.register(funnelsRoute, {
    authProvider: resolvedDeps.authProvider,
    membershipRepository: resolvedDeps.membershipRepository,
    organizationRepository: resolvedDeps.organizationRepository,
    userRepository: resolvedDeps.userRepository,
    funnelRepository: resolvedDeps.funnelRepository,
    activityLogRepository: resolvedDeps.activityLogRepository,
  })

  app.register(tasksRoute, {
    authProvider: resolvedDeps.authProvider,
    membershipRepository: resolvedDeps.membershipRepository,
    organizationRepository: resolvedDeps.organizationRepository,
    userRepository: resolvedDeps.userRepository,
    taskRepository: resolvedDeps.taskRepository,
    leadRepository: resolvedDeps.leadRepository,
    activityLogRepository: resolvedDeps.activityLogRepository,
    notificationRepository: resolvedDeps.notificationRepository,
  })

  app.register(organizationsRoute, {
    authProvider: resolvedDeps.authProvider,
    userRepository: resolvedDeps.userRepository,
    organizationRepository: resolvedDeps.organizationRepository,
    membershipRepository: resolvedDeps.membershipRepository,
    funnelRepository: resolvedDeps.funnelRepository,
    storageProvider: resolvedDeps.storageProvider,
  })

  app.register(dashboardRoute, {
    authProvider: resolvedDeps.authProvider,
    userRepository: resolvedDeps.userRepository,
    membershipRepository: resolvedDeps.membershipRepository,
    organizationRepository: resolvedDeps.organizationRepository,
    taskRepository: resolvedDeps.taskRepository,
    leadRepository: resolvedDeps.leadRepository,
    streakRepository: resolvedDeps.streakRepository,
  })

  app.register(teamRoute, {
    authProvider: resolvedDeps.authProvider,
    userRepository: resolvedDeps.userRepository,
    membershipRepository: resolvedDeps.membershipRepository,
    organizationRepository: resolvedDeps.organizationRepository,
    leadRepository: resolvedDeps.leadRepository,
    activityLogRepository: resolvedDeps.activityLogRepository,
  })

  app.register(organizationSettingsRoute, {
    authProvider: resolvedDeps.authProvider,
    organizationRepository: resolvedDeps.organizationRepository,
    membershipRepository: resolvedDeps.membershipRepository,
    storageProvider: resolvedDeps.storageProvider,
    userRepository: resolvedDeps.userRepository,
    activityLogRepository: resolvedDeps.activityLogRepository,
  })

  app.register(activityRoute, {
    authProvider: resolvedDeps.authProvider,
    membershipRepository: resolvedDeps.membershipRepository,
    organizationRepository: resolvedDeps.organizationRepository,
    userRepository: resolvedDeps.userRepository,
    activityLogRepository: resolvedDeps.activityLogRepository,
  })

  app.register(notificationsRoute, {
    authProvider: resolvedDeps.authProvider,
    membershipRepository: resolvedDeps.membershipRepository,
    organizationRepository: resolvedDeps.organizationRepository,
    userRepository: resolvedDeps.userRepository,
    notificationRepository: resolvedDeps.notificationRepository,
  })

  app.register(apiKeysRoute, {
    authProvider: resolvedDeps.authProvider,
    membershipRepository: resolvedDeps.membershipRepository,
    organizationRepository: resolvedDeps.organizationRepository,
    userRepository: resolvedDeps.userRepository,
    apiKeyRepository: resolvedDeps.apiKeyRepository,
    activityLogRepository: resolvedDeps.activityLogRepository,
  })

  app.register(webhooksRoute, {
    apiKeyRepository: resolvedDeps.apiKeyRepository,
    leadRepository: resolvedDeps.leadRepository,
    funnelRepository: resolvedDeps.funnelRepository,
    membershipRepository: resolvedDeps.membershipRepository,
    activityLogRepository: resolvedDeps.activityLogRepository,
    notificationRepository: resolvedDeps.notificationRepository,
    leadQueueRepository: resolvedDeps.leadQueueRepository,
  })

  return app
}
