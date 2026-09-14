// Rotas de organizações — hoje só a criação de Representações (tenants),
// restrita ao Super Admin da plataforma.
//
// POST /organizations — cria uma nova Representação independente + seu dono
// (Membership ADMIN). Requer authMiddleware + requirePlatformAdmin.

import type {
  IAuthProvider,
  IMembershipRepository,
  IOrganizationRepository,
  IUserRepository,
} from '@sylocrm/application'
import { CreateRepresentationUseCase } from '@sylocrm/application'
import { ConflictError } from '@sylocrm/domain'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { requirePlatformAdmin } from '../middleware/platform-admin.middleware'

interface OrganizationsRouteOptions {
  authProvider: IAuthProvider
  userRepository: IUserRepository
  organizationRepository: IOrganizationRepository
  membershipRepository: IMembershipRepository
}

const createRepresentationSchema = z.object({
  organizationName: z.string().min(1),
  ownerName: z.string().min(1),
  ownerEmail: z.string().email(),
})

export const organizationsRoute: FastifyPluginAsync<OrganizationsRouteOptions> = async (
  fastify,
  options,
) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const platformAdminMiddleware = requirePlatformAdmin(options.userRepository)

  const createRepresentation = new CreateRepresentationUseCase(
    options.authProvider,
    options.userRepository,
    options.organizationRepository,
    options.membershipRepository,
  )

  // ── POST /organizations ───────────────────────────────────────────────────
  fastify.post(
    '/organizations',
    { preHandler: [authMiddleware, platformAdminMiddleware] },
    async (request, reply) => {
      const parsed = createRepresentationSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados inválidos.',
          code: 'VALIDATION_ERROR',
          status: 400,
          details: parsed.error.flatten().fieldErrors,
        })
      }

      try {
        const result = await createRepresentation.execute(parsed.data)
        return reply.status(201).send({
          organization: result.organization,
          owner: {
            id: result.owner.id,
            email: result.owner.email,
            temporaryPassword: result.owner.temporaryPassword,
          },
        })
      } catch (error) {
        if (error instanceof ConflictError) {
          return reply.status(409).send({ error: error.message, code: error.code, status: 409 })
        }
        throw error
      }
    },
  )
}
