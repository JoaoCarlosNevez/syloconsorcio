// Rotas de equipe — listar, convidar, remover e reativar membros da
// organização ativa.
//
// GET    /team/members                    — lista TODOS os membros da
//                                            organização (qualquer status —
//                                            inclui desativados, pra
//                                            permitir reativar depois)
// POST   /team/members                    — convida um novo membro
//                                            (Supervisor ou Vendedor). Exige
//                                            user.invite; a hierarquia fina
//                                            é aplicada em
//                                            InviteTeamMemberUseCase.
// DELETE /team/members/:userId            — desativa um membro (status vira
//                                            SUSPENDED, não apaga). Exige
//                                            user.remove; a hierarquia fina
//                                            é aplicada em
//                                            RemoveTeamMemberUseCase. Super
//                                            Admin da plataforma ignora a
//                                            hierarquia.
// POST   /team/members/:userId/reactivate — reverte a desativação (status
//                                            volta pra ACTIVE). Mesma
//                                            permission e hierarquia do
//                                            DELETE.
// PATCH  /team/members/:userId            — define a meta de vendas do
//                                            membro (valor de crédito, em
//                                            centavos; null limpa). Exige
//                                            team.goal_update; hierarquia
//                                            fina em
//                                            UpdateTeamMemberSalesGoalUseCase.
// PUT    /team/me/sales-goal              — o próprio usuário define a sua
//                                            meta (Editar perfil). Qualquer
//                                            papel.
//
// GET    /team/goals/summary              — progresso do mês da meta pessoal
//                                            do usuário e da meta da
//                                            representação (soma das metas
//                                            dos membros). Qualquer papel.
//
// Todas rodam authMiddleware → tenantMiddleware.

import type {
  IAuthProvider,
  ILeadRepository,
  IMembershipRepository,
  IOrganizationRepository,
  IUserRepository,
} from '@sylocrm/application'
import {
  GetSalesGoalsSummaryUseCase,
  InviteTeamMemberUseCase,
  ReactivateTeamMemberUseCase,
  RemoveTeamMemberUseCase,
  UpdateTeamMemberSalesGoalUseCase,
} from '@sylocrm/application'
import { AuthorizationError, ConflictError, Permission, Role } from '@sylocrm/domain'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'
import { createTenantMiddleware } from '../middleware/tenant.middleware'

interface TeamRouteOptions {
  authProvider: IAuthProvider
  userRepository: IUserRepository
  membershipRepository: IMembershipRepository
  organizationRepository: IOrganizationRepository
  leadRepository: ILeadRepository
}

const INVITABLE_ROLES = [Role.MANAGER, Role.SELLER] as const

const inviteMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(INVITABLE_ROLES),
})

const updateMemberSchema = z.object({
  salesGoalCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
})

export const teamRoute: FastifyPluginAsync<TeamRouteOptions> = async (fastify, options) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(
    options.membershipRepository,
    options.userRepository,
    options.organizationRepository,
  )

  const inviteTeamMember = new InviteTeamMemberUseCase(
    options.authProvider,
    options.userRepository,
    options.membershipRepository,
  )

  const removeTeamMember = new RemoveTeamMemberUseCase(options.membershipRepository)
  const reactivateTeamMember = new ReactivateTeamMemberUseCase(options.membershipRepository)
  const updateSalesGoal = new UpdateTeamMemberSalesGoalUseCase(options.membershipRepository)
  const getSalesGoalsSummary = new GetSalesGoalsSummaryUseCase(
    options.membershipRepository,
    options.leadRepository,
  )

  // ── GET /team/members ─────────────────────────────────────────────────────
  fastify.get(
    '/team/members',
    { preHandler: [authMiddleware, tenantMiddleware] },
    async (request) => {
      const context = request.authContext as NonNullable<typeof request.authContext>
      const members = await options.membershipRepository.findByOrganizationId(
        context.currentMembership.organizationId,
      )
      return { members }
    },
  )

  // ── GET /team/goals/summary ───────────────────────────────────────────────
  fastify.get(
    '/team/goals/summary',
    { preHandler: [authMiddleware, tenantMiddleware] },
    async (request) => {
      const context = request.authContext as NonNullable<typeof request.authContext>
      const summary = await getSalesGoalsSummary.execute({
        organizationId: context.currentMembership.organizationId,
        userId: context.userId,
      })
      return {
        periodStart: summary.periodStart.toISOString(),
        periodEnd: summary.periodEnd.toISOString(),
        personal: summary.personal,
        organization: summary.organization,
      }
    },
  )

  // ── PUT /team/me/sales-goal ───────────────────────────────────────────────
  fastify.put(
    '/team/me/sales-goal',
    { preHandler: [authMiddleware, tenantMiddleware] },
    async (request, reply) => {
      const parsed = updateMemberSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados inválidos.',
          code: 'VALIDATION_ERROR',
          status: 400,
          details: parsed.error.flatten().fieldErrors,
        })
      }

      const context = request.authContext as NonNullable<typeof request.authContext>
      await updateSalesGoal.execute({
        actorUserId: context.userId,
        actorRole: context.currentMembership.role,
        actorIsPlatformAdmin: false,
        targetUserId: context.userId,
        targetRole: context.currentMembership.role,
        organizationId: context.currentMembership.organizationId,
        salesGoalCents: parsed.data.salesGoalCents,
      })
      return reply.status(204).send()
    },
  )

  // ── POST /team/members ────────────────────────────────────────────────────
  fastify.post(
    '/team/members',
    {
      preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.USER_INVITE)],
    },
    async (request, reply) => {
      const parsed = inviteMemberSchema.safeParse(request.body)
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
        const result = await inviteTeamMember.execute({
          inviterRole: context.currentMembership.role,
          organizationId: context.currentMembership.organizationId,
          targetRole: parsed.data.role,
          name: parsed.data.name,
          email: parsed.data.email,
        })
        return reply.status(201).send({
          member: {
            id: result.member.id,
            email: result.member.email,
            role: result.member.role,
            temporaryPassword: result.member.temporaryPassword,
          },
        })
      } catch (error) {
        if (error instanceof AuthorizationError) {
          return reply.status(403).send({ error: error.message, code: error.code, status: 403 })
        }
        if (error instanceof ConflictError) {
          return reply.status(409).send({ error: error.message, code: error.code, status: 409 })
        }
        throw error
      }
    },
  )

  // ── DELETE /team/members/:userId ──────────────────────────────────────────
  fastify.delete<{ Params: { userId: string } }>(
    '/team/members/:userId',
    {
      preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.USER_REMOVE)],
    },
    async (request, reply) => {
      const context = request.authContext as NonNullable<typeof request.authContext>
      const targetUserId = request.params.userId

      const target = await options.membershipRepository.findActiveByUserAndOrganization(
        targetUserId,
        context.currentMembership.organizationId,
      )
      if (!target) {
        return reply
          .status(404)
          .send({ error: 'Membro não encontrado.', code: 'MEMBER_NOT_FOUND', status: 404 })
      }

      const actor = await options.userRepository.findById(context.userId)

      try {
        await removeTeamMember.execute({
          removerRole: context.currentMembership.role,
          removerIsPlatformAdmin: actor?.isPlatformAdmin ?? false,
          actorUserId: context.userId,
          targetUserId,
          targetRole: target.role,
          organizationId: context.currentMembership.organizationId,
        })
        return reply.status(204).send()
      } catch (error) {
        if (error instanceof AuthorizationError) {
          return reply.status(403).send({ error: error.message, code: error.code, status: 403 })
        }
        throw error
      }
    },
  )

  // ── POST /team/members/:userId/reactivate ─────────────────────────────────
  fastify.post<{ Params: { userId: string } }>(
    '/team/members/:userId/reactivate',
    {
      preHandler: [authMiddleware, tenantMiddleware, requirePermission(Permission.USER_REMOVE)],
    },
    async (request, reply) => {
      const context = request.authContext as NonNullable<typeof request.authContext>
      const targetUserId = request.params.userId

      const target = await options.membershipRepository.findByUserAndOrganization(
        targetUserId,
        context.currentMembership.organizationId,
      )
      if (!target) {
        return reply
          .status(404)
          .send({ error: 'Membro não encontrado.', code: 'MEMBER_NOT_FOUND', status: 404 })
      }

      const actor = await options.userRepository.findById(context.userId)

      try {
        await reactivateTeamMember.execute({
          reactivatorRole: context.currentMembership.role,
          reactivatorIsPlatformAdmin: actor?.isPlatformAdmin ?? false,
          targetUserId,
          targetRole: target.role,
          organizationId: context.currentMembership.organizationId,
        })
        return reply.status(204).send()
      } catch (error) {
        if (error instanceof AuthorizationError) {
          return reply.status(403).send({ error: error.message, code: error.code, status: 403 })
        }
        throw error
      }
    },
  )

  // ── PATCH /team/members/:userId ───────────────────────────────────────────
  fastify.patch<{ Params: { userId: string } }>(
    '/team/members/:userId',
    {
      preHandler: [
        authMiddleware,
        tenantMiddleware,
        requirePermission(Permission.TEAM_GOAL_UPDATE),
      ],
    },
    async (request, reply) => {
      const parsed = updateMemberSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados inválidos.',
          code: 'VALIDATION_ERROR',
          status: 400,
          details: parsed.error.flatten().fieldErrors,
        })
      }

      const context = request.authContext as NonNullable<typeof request.authContext>
      const targetUserId = request.params.userId

      const target = await options.membershipRepository.findByUserAndOrganization(
        targetUserId,
        context.currentMembership.organizationId,
      )
      if (!target) {
        return reply
          .status(404)
          .send({ error: 'Membro não encontrado.', code: 'MEMBER_NOT_FOUND', status: 404 })
      }

      const actor = await options.userRepository.findById(context.userId)

      try {
        await updateSalesGoal.execute({
          actorUserId: context.userId,
          actorRole: context.currentMembership.role,
          actorIsPlatformAdmin: actor?.isPlatformAdmin ?? false,
          targetUserId,
          targetRole: target.role,
          organizationId: context.currentMembership.organizationId,
          salesGoalCents: parsed.data.salesGoalCents,
        })
        return reply.status(204).send()
      } catch (error) {
        if (error instanceof AuthorizationError) {
          return reply.status(403).send({ error: error.message, code: error.code, status: 403 })
        }
        throw error
      }
    },
  )
}
