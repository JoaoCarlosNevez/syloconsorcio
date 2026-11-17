// API entry point — loads env vars and starts the HTTP server.
// dotenv/config is imported first so process.env is populated before
// any other module reads it.
//
// This is the composition root: the only place that knows about Infrastructure.
// It creates the concrete adapters and injects them into the app factory.

import 'dotenv/config'
import { createHmac } from 'node:crypto'
import {
  GeneratePostSalePaymentTasksUseCase,
  OfferLeadToQueueUseCase,
  ProcessExpiredLeadOffersUseCase,
} from '@sylocrm/application'
import {
  DrizzleAchievementsRepository,
  DrizzleActivityLogRepository,
  DrizzleAdministratorRepository,
  DrizzleApiKeyRepository,
  DrizzleChatRepository,
  DrizzleEngagementRepository,
  DrizzleFunnelRepository,
  DrizzleGoogleAccountRepository,
  DrizzleLeadAdhesionRepository,
  DrizzleLeadChecklistRepository,
  DrizzleLeadProposalRepository,
  DrizzleLeadQueueRepository,
  DrizzleLeadRepository,
  DrizzleManagementDashboardRepository,
  DrizzleMembershipRepository,
  DrizzleNotificationRepository,
  DrizzleOrganizationRepository,
  DrizzlePostSalePaymentRepository,
  DrizzleStreakRepository,
  DrizzleTaskRepository,
  DrizzleUserRepository,
  GoogleGmailGateway,
  HmacOAuthStateSigner,
  SupabaseAuthAdapter,
  SupabaseStorageAdapter,
  TokenCipher,
  createDatabase,
  pingDatabase,
} from '@sylocrm/infrastructure'
import { buildApp } from './app'
import { env } from './config/env'
import { startLeadOfferExpiryWorker } from './workers/lead-offer-expiry'
import { startPostSalePaymentsWorker } from './workers/post-sale-payments'

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
  ? createDatabase({ url: env.DATABASE_URL, ssl: 'require', maxConnections: env.DATABASE_POOL_MAX })
  : undefined

const membershipRepository = database ? new DrizzleMembershipRepository(database) : undefined
const leadRepository = database ? new DrizzleLeadRepository(database) : undefined
const organizationRepository = database ? new DrizzleOrganizationRepository(database) : undefined
const userRepository = database ? new DrizzleUserRepository(database) : undefined
const funnelRepository = database ? new DrizzleFunnelRepository(database) : undefined
const leadProposalRepository = database ? new DrizzleLeadProposalRepository(database) : undefined
const taskRepository = database ? new DrizzleTaskRepository(database) : undefined
const chatRepository = database ? new DrizzleChatRepository(database) : undefined
const administratorRepository = database ? new DrizzleAdministratorRepository(database) : undefined
const activityLogRepository = database ? new DrizzleActivityLogRepository(database) : undefined
const notificationRepository = database ? new DrizzleNotificationRepository(database) : undefined
const apiKeyRepository = database ? new DrizzleApiKeyRepository(database) : undefined
const leadQueueRepository = database ? new DrizzleLeadQueueRepository(database) : undefined
const streakRepository = database ? new DrizzleStreakRepository(database) : undefined
const leadAdhesionRepository = database ? new DrizzleLeadAdhesionRepository(database) : undefined
const leadChecklistRepository = database ? new DrizzleLeadChecklistRepository(database) : undefined
const postSalePaymentRepository = database
  ? new DrizzlePostSalePaymentRepository(database)
  : undefined
const achievementsRepository = database ? new DrizzleAchievementsRepository(database) : undefined
const engagementRepository = database ? new DrizzleEngagementRepository(database) : undefined
const managementDashboardRepository = database
  ? new DrizzleManagementDashboardRepository(database)
  : undefined

// Envio pelo Gmail do usuário — só com as credenciais do Google e a chave que
// criptografa o token no banco.
const gmail =
  database &&
  env.GOOGLE_CLIENT_ID &&
  env.GOOGLE_CLIENT_SECRET &&
  env.GOOGLE_REDIRECT_URI &&
  env.TOKEN_ENCRYPTION_KEY
    ? {
        accounts: new DrizzleGoogleAccountRepository(
          database,
          new TokenCipher(env.TOKEN_ENCRYPTION_KEY),
        ),
        gateway: new GoogleGmailGateway({
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          redirectUri: env.GOOGLE_REDIRECT_URI,
        }),
        // Segredo do state derivado da chave (não reaproveita a chave crua).
        stateSigner: new HmacOAuthStateSigner(
          createHmac('sha256', env.TOKEN_ENCRYPTION_KEY).update('oauth-state').digest('base64'),
        ),
      }
    : null

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
  chatRepository,
  administratorRepository,
  activityLogRepository,
  notificationRepository,
  apiKeyRepository,
  leadQueueRepository,
  streakRepository,
  leadAdhesionRepository,
  leadChecklistRepository,
  postSalePaymentRepository,
  managementDashboardRepository,
  engagementRepository,
  achievementsRepository,
  // 3s: o healthcheck do Swarm desiste em 5s.
  checkDatabase: database ? () => pingDatabase(database, 3000) : undefined,
  gmail,
})

// Fila de Leads: passa adiante os leads que ninguém aceitou no prazo. O
// worker sobe depois do listen; o hook de onClose precisa ser registrado antes.
let stopLeadOfferWorker: (() => void) | null = null
let stopPostSalePaymentsWorker: (() => void) | null = null
app.addHook('onClose', async () => {
  stopLeadOfferWorker?.()
  stopPostSalePaymentsWorker?.()
})

try {
  await app.listen({ port: env.PORT, host: env.HOST })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

if (leadQueueRepository && leadRepository && membershipRepository) {
  const processExpiredLeadOffers = new ProcessExpiredLeadOffersUseCase(
    leadQueueRepository,
    new OfferLeadToQueueUseCase(leadQueueRepository, leadRepository, notificationRepository),
    membershipRepository,
    notificationRepository,
  )
  stopLeadOfferWorker = startLeadOfferExpiryWorker(processExpiredLeadOffers, app.log)
}

if (postSalePaymentRepository) {
  stopPostSalePaymentsWorker = startPostSalePaymentsWorker(
    new GeneratePostSalePaymentTasksUseCase(postSalePaymentRepository),
    app.log,
  )
}
