// API entry point — loads env vars and starts the HTTP server.
// dotenv/config is imported first so process.env is populated before
// any other module reads it.
//
// This is the composition root: the only place that knows about Infrastructure.
// It creates the concrete adapters and injects them into the app factory.

import 'dotenv/config'
import {
  DispatchPushNotificationsUseCase,
  GeneratePostSalePaymentTasksUseCase,
  OfferLeadToQueueUseCase,
  ProcessExpiredLeadOffersUseCase,
} from '@sylocrm/application'
import {
  DrizzleAchievementsRepository,
  DrizzleActivityLogRepository,
  DrizzleApiKeyRepository,
  DrizzleEngagementRepository,
  DrizzleFunnelRepository,
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
  DrizzlePushOutboxRepository,
  DrizzlePushSubscriptionRepository,
  DrizzleStreakRepository,
  DrizzleTaskRepository,
  DrizzleUserRepository,
  SupabaseAuthAdapter,
  SupabaseStorageAdapter,
  WebPushSender,
  createDatabase,
} from '@sylocrm/infrastructure'
import { buildApp } from './app'
import { env } from './config/env'
import { HmacPushActionTokens } from './lib/push-action-tokens'
import { startLeadOfferExpiryWorker } from './workers/lead-offer-expiry'
import { startPostSalePaymentsWorker } from './workers/post-sale-payments'
import { startPushNotificationsWorker } from './workers/push-notifications'

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

const pushSubscriptionRepository = database
  ? new DrizzlePushSubscriptionRepository(database)
  : undefined
// Web Push só liga com as duas chaves VAPID.
const pushSender =
  env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
    ? new WebPushSender({
        publicKey: env.VAPID_PUBLIC_KEY,
        privateKey: env.VAPID_PRIVATE_KEY,
        subject: env.VAPID_SUBJECT,
      })
    : undefined

// Token dos botões Aceitar/Recusar da oferta no push — assinado com a chave
// VAPID privada, que já é segredo e só existe com o push ligado.
const pushActionTokens =
  pushSender && env.VAPID_PRIVATE_KEY ? new HmacPushActionTokens(env.VAPID_PRIVATE_KEY) : null

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
  pushSubscriptionRepository,
  vapidPublicKey: pushSender ? (env.VAPID_PUBLIC_KEY ?? null) : null,
  pushActionTokens,
})

// Fila de Leads: passa adiante os leads que ninguém aceitou no prazo. O
// worker sobe depois do listen; o hook de onClose precisa ser registrado antes.
let stopLeadOfferWorker: (() => void) | null = null
let stopPostSalePaymentsWorker: (() => void) | null = null
let stopPushWorker: (() => void) | null = null
app.addHook('onClose', async () => {
  stopLeadOfferWorker?.()
  stopPostSalePaymentsWorker?.()
  stopPushWorker?.()
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

if (database && pushSubscriptionRepository && pushSender) {
  stopPushWorker = startPushNotificationsWorker(
    new DispatchPushNotificationsUseCase(
      new DrizzlePushOutboxRepository(database),
      pushSubscriptionRepository,
      pushSender,
      pushActionTokens,
    ),
    app.log,
  )
}
