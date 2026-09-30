// Rotas de organizações — painel de Administração do Super Admin da plataforma.
//
// POST   /organizations             — cria uma Representação independente e, se
//                                      informado, o dono (ADMIN) — dono opcional
// GET    /organizations             — lista todas as organizações
// PATCH  /organizations/:id         — edita nome
// POST   /organizations/:id/icon    — envia o ícone (upload para Supabase Storage)
// GET    /organizations/:id/members — lista a equipe ativa de uma organização qualquer
// GET    /organizations/members     — lista TODOS os membros da plataforma (qualquer status, cross-org)
// POST   /organizations/members     — cria um usuário com qualquer Role em qualquer Representação
// DELETE /organizations/members/:userId — apaga a conta da pessoa da plataforma inteira
//         (login + todos os memberships; ver DeletePlatformUserUseCase pro porquê o registro
//         em `users` não é apagado)
//
// Todas exigem authMiddleware + requirePlatformAdmin — não são escopadas por
// tenant (o Super Admin não precisa ser membro da organização-alvo).

import type {
  IAuthProvider,
  IMembershipRepository,
  IOrganizationRepository,
  IStorageProvider,
  IUserRepository,
} from '@sylocrm/application'
import { STORAGE_BUCKETS } from '@sylocrm/application'
import {
  CreatePlatformUserUseCase,
  CreateRepresentationUseCase,
  DeletePlatformUserUseCase,
} from '@sylocrm/application'
import { AuthorizationError, ConflictError, Role } from '@sylocrm/domain'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { validateIconUpload } from '../lib/icon-validation'
import { compressImage } from '../lib/image-processing'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { requirePlatformAdmin } from '../middleware/platform-admin.middleware'

interface OrganizationsRouteOptions {
  authProvider: IAuthProvider
  userRepository: IUserRepository
  organizationRepository: IOrganizationRepository
  membershipRepository: IMembershipRepository
  storageProvider: IStorageProvider
}

// Dono opcional: manda nome e e-mail juntos, ou nenhum dos dois.
const createRepresentationSchema = z
  .object({
    organizationName: z.string().trim().min(1),
    ownerName: z.string().trim().min(1).optional(),
    ownerEmail: z.string().trim().email().optional(),
  })
  .refine((data) => (data.ownerName === undefined) === (data.ownerEmail === undefined), {
    message: 'Informe nome e e-mail do dono, ou deixe os dois em branco.',
    path: ['ownerEmail'],
  })

const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  isWhiteLabel: z.boolean().optional(),
})

const createPlatformUserSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum([Role.ADMIN, Role.MANAGER, Role.SELLER]),
})

function validationErrorResponse(fieldErrors: Record<string, string[] | undefined>) {
  return { error: 'Dados inválidos.', code: 'VALIDATION_ERROR', status: 400, details: fieldErrors }
}

function organizationNotFoundResponse() {
  return { error: 'Organização não encontrada.', code: 'ORGANIZATION_NOT_FOUND', status: 404 }
}

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

  const createPlatformUser = new CreatePlatformUserUseCase(
    options.authProvider,
    options.userRepository,
    options.membershipRepository,
  )

  const deletePlatformUser = new DeletePlatformUserUseCase(
    options.authProvider,
    options.membershipRepository,
    options.userRepository,
    options.storageProvider,
  )

  // ── GET /organizations ────────────────────────────────────────────────────
  fastify.get(
    '/organizations',
    { preHandler: [authMiddleware, platformAdminMiddleware] },
    async () => {
      const organizations = await options.organizationRepository.list()
      return { organizations }
    },
  )

  // ── GET /organizations/members ────────────────────────────────────────────
  fastify.get(
    '/organizations/members',
    { preHandler: [authMiddleware, platformAdminMiddleware] },
    async () => {
      const members = await options.membershipRepository.findAll()
      return { members }
    },
  )

  // ── DELETE /organizations/members/:userId ─────────────────────────────────
  fastify.delete<{ Params: { userId: string } }>(
    '/organizations/members/:userId',
    { preHandler: [authMiddleware, platformAdminMiddleware] },
    async (request, reply) => {
      const identity = request.authIdentity as NonNullable<typeof request.authIdentity>

      try {
        await deletePlatformUser.execute({
          actorUserId: identity.id,
          targetUserId: request.params.userId,
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

  // ── POST /organizations/members ───────────────────────────────────────────
  fastify.post(
    '/organizations/members',
    { preHandler: [authMiddleware, platformAdminMiddleware] },
    async (request, reply) => {
      const parsed = createPlatformUserSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send(validationErrorResponse(parsed.error.flatten().fieldErrors))
      }

      const organization = await options.organizationRepository.findById(parsed.data.organizationId)
      if (!organization) {
        return reply.status(404).send(organizationNotFoundResponse())
      }

      try {
        const result = await createPlatformUser.execute(parsed.data)
        return reply.status(201).send({
          member: {
            id: result.member.id,
            email: result.member.email,
            role: result.member.role,
            temporaryPassword: result.member.temporaryPassword,
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

  // ── POST /organizations ───────────────────────────────────────────────────
  fastify.post(
    '/organizations',
    { preHandler: [authMiddleware, platformAdminMiddleware] },
    async (request, reply) => {
      const parsed = createRepresentationSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send(validationErrorResponse(parsed.error.flatten().fieldErrors))
      }

      try {
        const { organizationName, ownerName, ownerEmail } = parsed.data
        const result = await createRepresentation.execute({
          organizationName,
          owner:
            ownerName !== undefined && ownerEmail !== undefined
              ? { name: ownerName, email: ownerEmail }
              : null,
        })
        return reply.status(201).send({
          organization: result.organization,
          owner: result.owner
            ? {
                id: result.owner.id,
                email: result.owner.email,
                temporaryPassword: result.owner.temporaryPassword,
              }
            : null,
        })
      } catch (error) {
        if (error instanceof ConflictError) {
          return reply.status(409).send({ error: error.message, code: error.code, status: 409 })
        }
        throw error
      }
    },
  )

  // ── PATCH /organizations/:id ──────────────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    '/organizations/:id',
    { preHandler: [authMiddleware, platformAdminMiddleware] },
    async (request, reply) => {
      const parsed = updateOrganizationSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send(validationErrorResponse(parsed.error.flatten().fieldErrors))
      }

      const organization = await options.organizationRepository.update(
        request.params.id,
        parsed.data,
      )
      if (!organization) {
        return reply.status(404).send(organizationNotFoundResponse())
      }
      return { organization }
    },
  )

  // ── POST /organizations/:id/icon ──────────────────────────────────────────
  fastify.post<{ Params: { id: string } }>(
    '/organizations/:id/icon',
    { preHandler: [authMiddleware, platformAdminMiddleware] },
    async (request, reply) => {
      const organization = await options.organizationRepository.findById(request.params.id)
      if (!organization) {
        return reply.status(404).send(organizationNotFoundResponse())
      }

      const file = await request.file()
      if (!file) {
        return reply
          .status(400)
          .send({ error: 'Nenhum arquivo enviado.', code: 'VALIDATION_ERROR', status: 400 })
      }

      const buffer = await file.toBuffer()
      const validationError = validateIconUpload(buffer, file.mimetype)
      if (validationError) {
        return reply
          .status(400)
          .send({ error: validationError.message, code: validationError.code, status: 400 })
      }

      const processed = await compressImage(buffer, file.mimetype)
      const path = `${organization.id}/icon.${processed.extension}`
      const { url } = await options.storageProvider.uploadPublicFile({
        bucket: STORAGE_BUCKETS.organizationIcons,
        path,
        data: processed.buffer,
        contentType: processed.contentType,
      })
      // Mantém só o arquivo vigente na pasta — ex: trocar SVG por PNG deixaria
      // o icon.svg antigo pra trás. Falha aqui não desfaz o upload (que já deu
      // certo); só fica registrada no log.
      try {
        await options.storageProvider.deleteFolderFiles({
          bucket: STORAGE_BUCKETS.organizationIcons,
          folder: organization.id,
          keepPath: path,
        })
      } catch (error) {
        request.log.warn({ err: error }, 'Falha ao limpar arquivos antigos do Storage')
      }

      const updated = await options.organizationRepository.update(organization.id, {
        branding: { ...organization.branding, iconUrl: url },
      })

      return { organization: updated }
    },
  )

  // ── GET /organizations/:id/members ────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/organizations/:id/members',
    { preHandler: [authMiddleware, platformAdminMiddleware] },
    async (request) => {
      const members = await options.membershipRepository.findActiveByOrganizationId(
        request.params.id,
      )
      return { members }
    },
  )
}
