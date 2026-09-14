// Rotas de equipe — listar e convidar membros da organização ativa.
//
// GET  /team/members — lista os membros ativos da organização (qualquer
//                       membership ativa pode ver a própria equipe)
// POST /team/members — convida um novo membro (Supervisor ou Vendedor).
//                       Exige lead.invite (user.invite); a hierarquia fina
//                       (quem pode conceder qual Role) é aplicada em
//                       InviteTeamMemberUseCase.
//
// Todas rodam authMiddleware → tenantMiddleware.

import type { IAuthProvider, IMembershipRepository, IUserRepository } from '@sylocrm/application'
import { InviteTeamMemberUseCase } from '@sylocrm/application'
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
}

const INVITABLE_ROLES = [Role.MANAGER, Role.SELLER] as const

const inviteMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(INVITABLE_ROLES),
})

export const teamRoute: FastifyPluginAsync<TeamRouteOptions> = async (fastify, options) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(options.membershipRepository)

  const inviteTeamMember = new InviteTeamMemberUseCase(
    options.authProvider,
    options.userRepository,
    options.membershipRepository,
  )

  // ── GET /team/members ─────────────────────────────────────────────────────
  fastify.get(
    '/team/members',
    { preHandler: [authMiddleware, tenantMiddleware] },
    async (request) => {
      const context = request.authContext as NonNullable<typeof request.authContext>
      const members = await options.membershipRepository.findActiveByOrganizationId(
        context.currentMembership.organizationId,
      )
      return { members }
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
}
