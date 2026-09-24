// Rotas de configurações da própria organização — tela Configurações > Organização.
//
// GET   /organization       — dados da organização ativa (qualquer membership ativa)
// PATCH /organization       — edita nome/CNPJ/telefone/site/leadSegments/leadSources/leadTags/
//                             salesGoalCents (meta mensal da organização);
//                             exige organization.update (só ADMIN — ver auth/permissions.ts)
// POST  /organization/icon  — envia o ícone; exige organization.update E isWhiteLabel=true
//                             (organizações sem White Label usam a marca Sylo por padrão)
// PATCH /organization/branding — define/limpa a cor secundária (branding.secondaryColor);
//                             mesmas exigências do ícone
//
// Diferente de organizations.route.ts (plural, Super Admin, cross-tenant), estas rotas
// são escopadas pela organização ativa da própria requisição (X-Organization-Id).

import type {
  IMembershipRepository,
  IOrganizationRepository,
  IStorageProvider,
  IUserRepository,
} from '@sylocrm/application'
import type { IAuthProvider } from '@sylocrm/application'
import { Permission } from '@sylocrm/domain'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { validateIconUpload } from '../lib/icon-validation'
import { compressImage } from '../lib/image-processing'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'
import { createTenantMiddleware } from '../middleware/tenant.middleware'

interface OrganizationSettingsRouteOptions {
  authProvider: IAuthProvider
  organizationRepository: IOrganizationRepository
  membershipRepository: IMembershipRepository
  storageProvider: IStorageProvider
  userRepository: IUserRepository
}

const ICON_BUCKET = 'organization-icons'

const updateOrganizationSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  cnpj: z.string().min(1).nullable().optional(),
  phone: z.string().min(1).nullable().optional(),
  website: z.string().min(1).nullable().optional(),
  leadSegments: z.array(z.string().min(1)).optional(),
  leadSources: z.array(z.string().min(1)).optional(),
  leadTags: z.array(z.string().min(1)).optional(),
  salesGoalCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable().optional(),
})

const updateBrandingSchema = z.object({
  secondaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #RRGGBB.')
    .nullable(),
})

function validationErrorResponse(fieldErrors: Record<string, string[] | undefined>) {
  return { error: 'Dados inválidos.', code: 'VALIDATION_ERROR', status: 400, details: fieldErrors }
}

export const organizationSettingsRoute: FastifyPluginAsync<
  OrganizationSettingsRouteOptions
> = async (fastify, options) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(
    options.membershipRepository,
    options.userRepository,
    options.organizationRepository,
  )
  const requireOrganizationUpdate = requirePermission(Permission.ORGANIZATION_UPDATE)

  // ── GET /organization ──────────────────────────────────────────────────────
  fastify.get(
    '/organization',
    { preHandler: [authMiddleware, tenantMiddleware] },
    async (request, reply) => {
      const context = request.authContext as NonNullable<typeof request.authContext>
      const organization = await options.organizationRepository.findById(
        context.currentMembership.organizationId,
      )
      if (!organization) {
        return reply.status(404).send({
          error: 'Organização não encontrada.',
          code: 'ORGANIZATION_NOT_FOUND',
          status: 404,
        })
      }
      return { organization }
    },
  )

  // ── PATCH /organization ────────────────────────────────────────────────────
  fastify.patch(
    '/organization',
    { preHandler: [authMiddleware, tenantMiddleware, requireOrganizationUpdate] },
    async (request, reply) => {
      const parsed = updateOrganizationSettingsSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send(validationErrorResponse(parsed.error.flatten().fieldErrors))
      }

      const context = request.authContext as NonNullable<typeof request.authContext>
      const organization = await options.organizationRepository.update(
        context.currentMembership.organizationId,
        parsed.data,
      )
      if (!organization) {
        return reply.status(404).send({
          error: 'Organização não encontrada.',
          code: 'ORGANIZATION_NOT_FOUND',
          status: 404,
        })
      }
      return { organization }
    },
  )

  // ── POST /organization/icon ────────────────────────────────────────────────
  fastify.post(
    '/organization/icon',
    { preHandler: [authMiddleware, tenantMiddleware, requireOrganizationUpdate] },
    async (request, reply) => {
      const context = request.authContext as NonNullable<typeof request.authContext>
      const organization = await options.organizationRepository.findById(
        context.currentMembership.organizationId,
      )
      if (!organization) {
        return reply.status(404).send({
          error: 'Organização não encontrada.',
          code: 'ORGANIZATION_NOT_FOUND',
          status: 404,
        })
      }

      if (!organization.isWhiteLabel) {
        return reply.status(403).send({
          error: 'Esta organização não é White Label — não é possível definir um ícone próprio.',
          code: 'NOT_WHITE_LABEL',
          status: 403,
        })
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
      const { url } = await options.storageProvider.uploadPublicFile({
        bucket: ICON_BUCKET,
        path: `${organization.id}/icon.${processed.extension}`,
        data: processed.buffer,
        contentType: processed.contentType,
      })

      const updated = await options.organizationRepository.update(organization.id, {
        branding: { ...organization.branding, iconUrl: url },
      })

      return { organization: updated }
    },
  )

  // ── PATCH /organization/branding ───────────────────────────────────────────
  fastify.patch(
    '/organization/branding',
    { preHandler: [authMiddleware, tenantMiddleware, requireOrganizationUpdate] },
    async (request, reply) => {
      const parsed = updateBrandingSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send(validationErrorResponse(parsed.error.flatten().fieldErrors))
      }

      const context = request.authContext as NonNullable<typeof request.authContext>
      const organization = await options.organizationRepository.findById(
        context.currentMembership.organizationId,
      )
      if (!organization) {
        return reply.status(404).send({
          error: 'Organização não encontrada.',
          code: 'ORGANIZATION_NOT_FOUND',
          status: 404,
        })
      }

      if (!organization.isWhiteLabel) {
        return reply.status(403).send({
          error: 'Esta organização não é White Label — não é possível definir cores próprias.',
          code: 'NOT_WHITE_LABEL',
          status: 403,
        })
      }

      const { secondaryColor: _previous, ...rest } = organization.branding ?? {}
      const branding =
        parsed.data.secondaryColor === null
          ? rest
          : { ...rest, secondaryColor: parsed.data.secondaryColor.toLowerCase() }

      const updated = await options.organizationRepository.update(organization.id, { branding })
      return { organization: updated }
    },
  )
}
