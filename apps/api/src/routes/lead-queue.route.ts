// Fila de distribuição dos leads do webhook (ver ILeadQueueRepository).
//
// GET  /lead-queue                 — configuração, ordem atual da fila e leads
//                                    aguardando aceite (lead_queue.manage)
// PUT  /lead-queue                 — salva ligada/desligada, tempo pra aceitar
//                                    e quem participa (lead_queue.manage)
// GET  /lead-offers/mine           — leads que a fila está oferecendo ao
//                                    usuário agora (lead.read)
// POST /lead-offers/:id/accept     — aceita: o lead passa a ser do usuário.
//                                    409 se o prazo acabou ou o lead já tem dono
// POST /lead-offers/:id/decline    — recusa: o lead vai na hora pro próximo
//
// As ofertas vencidas são passadas adiante pelo worker em
// workers/lead-offer-expiry.ts, não por estas rotas.

import type {
  IAuthProvider,
  ILeadQueueRepository,
  ILeadRepository,
  IMembershipRepository,
  INotificationRepository,
  IOrganizationRepository,
  IUserRepository,
} from '@sylocrm/application'
import {
  GetLeadQueueUseCase,
  LEAD_QUEUE_TIMEOUT_LIMITS,
  ListMyLeadOffersUseCase,
  OfferLeadToQueueUseCase,
  RespondLeadOfferUseCase,
  UpdateLeadQueueSettingsUseCase,
} from '@sylocrm/application'
import { ConflictError, Permission, ValidationError } from '@sylocrm/domain'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'
import { createTenantMiddleware } from '../middleware/tenant.middleware'

interface LeadQueueRouteOptions {
  authProvider: IAuthProvider
  membershipRepository: IMembershipRepository
  organizationRepository: IOrganizationRepository
  userRepository: IUserRepository
  leadRepository: ILeadRepository
  leadQueueRepository: ILeadQueueRepository
  notificationRepository: INotificationRepository
}

const updateSettingsSchema = z.object({
  enabled: z.boolean(),
  timeoutMinutes: z
    .number()
    .int()
    .min(LEAD_QUEUE_TIMEOUT_LIMITS.min)
    .max(LEAD_QUEUE_TIMEOUT_LIMITS.max),
  memberUserIds: z.array(z.string().uuid()).max(200),
})

const offerParamsSchema = z.object({ id: z.string().uuid() })

const OFFER_NOT_FOUND = { error: 'Oferta não encontrada.', code: 'OFFER_NOT_FOUND', status: 404 }

export const leadQueueRoute: FastifyPluginAsync<LeadQueueRouteOptions> = async (
  fastify,
  options,
) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(
    options.membershipRepository,
    options.userRepository,
    options.organizationRepository,
  )

  const offerLeadToQueue = new OfferLeadToQueueUseCase(
    options.leadQueueRepository,
    options.leadRepository,
    options.notificationRepository,
  )
  const getLeadQueue = new GetLeadQueueUseCase(options.leadQueueRepository, options.leadRepository)
  const updateLeadQueueSettings = new UpdateLeadQueueSettingsUseCase(
    options.leadQueueRepository,
    options.membershipRepository,
  )
  const listMyLeadOffers = new ListMyLeadOffersUseCase(
    options.leadQueueRepository,
    options.leadRepository,
  )
  const respondLeadOffer = new RespondLeadOfferUseCase(
    options.leadQueueRepository,
    options.leadRepository,
    offerLeadToQueue,
    options.membershipRepository,
    options.notificationRepository,
  )

  // ── GET /lead-queue ───────────────────────────────────────────────────────
  fastify.get(
    '/lead-queue',
    {
      preHandler: [
        authMiddleware,
        tenantMiddleware,
        requirePermission(Permission.LEAD_QUEUE_MANAGE),
      ],
    },
    async (request) => {
      const context = request.authContext as NonNullable<typeof request.authContext>
      return getLeadQueue.execute({
        organizationId: context.currentMembership.organizationId,
        now: new Date(),
      })
    },
  )

  // ── PUT /lead-queue ───────────────────────────────────────────────────────
  fastify.put(
    '/lead-queue',
    {
      preHandler: [
        authMiddleware,
        tenantMiddleware,
        requirePermission(Permission.LEAD_QUEUE_MANAGE),
      ],
    },
    async (request, reply) => {
      const parsed = updateSettingsSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados inválidos.',
          code: 'VALIDATION_ERROR',
          status: 400,
          details: parsed.error.flatten().fieldErrors,
        })
      }
      const context = request.authContext as NonNullable<typeof request.authContext>
      try {
        const settings = await updateLeadQueueSettings.execute({
          organizationId: context.currentMembership.organizationId,
          ...parsed.data,
          now: new Date(),
        })
        return { settings }
      } catch (error) {
        if (error instanceof ValidationError) {
          return reply.status(400).send({
            error: error.issues[0]?.message ?? 'Dados inválidos.',
            code: error.code,
            status: 400,
          })
        }
        throw error
      }
    },
  )

  // ── GET /lead-offers/mine ─────────────────────────────────────────────────
  fastify.get(
    '/lead-offers/mine',
    { preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.LEAD_READ)] },
    async (request) => {
      const context = request.authContext as NonNullable<typeof request.authContext>
      const offers = await listMyLeadOffers.execute({
        organizationId: context.currentMembership.organizationId,
        userId: context.userId,
        now: new Date(),
      })
      return { offers }
    },
  )

  // ── POST /lead-offers/:id/accept | /decline ───────────────────────────────
  for (const action of ['accept', 'decline'] as const) {
    fastify.post<{ Params: { id: string } }>(
      `/lead-offers/:id/${action}`,
      { preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.LEAD_READ)] },
      async (request, reply) => {
        const params = offerParamsSchema.safeParse(request.params)
        if (!params.success) return reply.status(404).send(OFFER_NOT_FOUND)

        const context = request.authContext as NonNullable<typeof request.authContext>
        try {
          const result = await respondLeadOffer.execute({
            offerId: params.data.id,
            userId: context.userId,
            organizationId: context.currentMembership.organizationId,
            action,
            now: new Date(),
          })
          if (!result) return reply.status(404).send(OFFER_NOT_FOUND)
          return result.action === 'accept'
            ? { lead: { id: result.lead.id, funnelId: result.lead.funnelId } }
            : { ok: true }
        } catch (error) {
          if (error instanceof ConflictError) {
            return reply.status(409).send({ error: error.message, code: error.code, status: 409 })
          }
          throw error
        }
      },
    )
  }
}
