// Rotas de autenticação.
//
// POST  /auth/logout      — invalida a sessão do usuário autenticado
// GET   /auth/me          — retorna a identidade e o perfil do usuário autenticado
// PATCH /auth/me          — autoatualização de perfil (nome, Instagram, cidade/região)
// GET   /auth/memberships — lista as organizações às quais o usuário pertence
// GET   /auth/context     — resolve o contexto multi-tenant para a organização ativa
//
// Todas requerem authMiddleware (Bearer token válido).
// Apenas /auth/context requer tenantMiddleware — as demais não dependem de
// um X-Organization-Id já escolhido (o frontend usa /auth/memberships
// justamente para decidir qual organização selecionar).
//
// Login acontece diretamente no Supabase via SDK no frontend (ADR-06).
// Troca de senha também é direta no Supabase via SDK no frontend — não há
// rota aqui pra isso (o backend nunca vê a senha).

import type {
  IAuthProvider,
  IMembershipRepository,
  IOrganizationRepository,
  IUserRepository,
  UserMembership,
} from '@sylocrm/application'
import { Role } from '@sylocrm/domain'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { buildMembershipContext } from '../auth/membership-context'
import { createAuthMiddleware } from '../middleware/auth.middleware'
import { createTenantMiddleware } from '../middleware/tenant.middleware'

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  instagramHandle: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, ''))
    .nullable()
    .optional(),
  location: z.string().min(1).nullable().optional(),
})

interface AuthRouteOptions {
  authProvider: IAuthProvider
  membershipRepository: IMembershipRepository
  userRepository: IUserRepository
  organizationRepository: IOrganizationRepository
}

export const authRoute: FastifyPluginAsync<AuthRouteOptions> = async (fastify, options) => {
  const authMiddleware = createAuthMiddleware(options.authProvider)
  const tenantMiddleware = createTenantMiddleware(
    options.membershipRepository,
    options.userRepository,
    options.organizationRepository,
  )

  // ── GET /auth/me ──────────────────────────────────────────────────────────
  // Retorna a identidade e o perfil do usuário autenticado.
  // Usado pelo frontend para verificar se a sessão ainda é válida no carregamento,
  // e pra pré-preencher a tela de Editar Perfil.
  fastify.get('/auth/me', { preHandler: [authMiddleware] }, async (request) => {
    // authMiddleware garante que authIdentity está presente
    const identity = request.authIdentity as NonNullable<typeof request.authIdentity>
    const user = await options.userRepository.findById(identity.id)
    return {
      id: identity.id,
      email: identity.email,
      name: user?.name ?? null,
      instagramHandle: user?.instagramHandle ?? null,
      location: user?.location ?? null,
      isPlatformAdmin: user?.isPlatformAdmin ?? false,
      createdAt: user?.createdAt ?? null,
    }
  })

  // ── PATCH /auth/me ────────────────────────────────────────────────────────
  // Autoatualização de perfil pelo próprio usuário. Nunca toca em email
  // (gerenciado pelo administrador da organização) nem isPlatformAdmin.
  fastify.patch('/auth/me', { preHandler: [authMiddleware] }, async (request, reply) => {
    const parsed = updateProfileSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Dados inválidos.',
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten().fieldErrors,
      })
    }

    const identity = request.authIdentity as NonNullable<typeof request.authIdentity>
    const user = await options.userRepository.updateProfile(identity.id, parsed.data)

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      instagramHandle: user.instagramHandle,
      location: user.location,
      isPlatformAdmin: user.isPlatformAdmin,
      createdAt: user.createdAt,
    }
  })

  // ── GET /auth/memberships ─────────────────────────────────────────────────
  // Lista todas as organizações ativas do usuário, com role/dataScope/permissions
  // já calculados. O frontend usa isto para montar o seletor de organização
  // (ou auto-selecionar quando há apenas uma) antes de enviar X-Organization-Id.
  //
  // Super Admin da plataforma (isPlatformAdmin) enxerga TODAS as organizações
  // aqui, não só as que tem membership real — as demais entram com um ADMIN
  // sintético (nunca persistido; mesma lógica de tenantMiddleware), pra que o
  // seletor de organização sempre tenha algo pra mostrar e o Super Admin
  // consiga navegar pra qualquer Representação a partir dele.
  fastify.get('/auth/memberships', { preHandler: [authMiddleware] }, async (request) => {
    // authMiddleware garante que authIdentity está presente
    const identity = request.authIdentity
    const memberships = await options.membershipRepository.findActiveByUserId(identity?.id ?? '')

    const user = await options.userRepository.findById(identity?.id ?? '')
    if (!user?.isPlatformAdmin) {
      return { memberships: memberships.map(buildMembershipContext) }
    }

    const allOrganizations = await options.organizationRepository.list()
    const membershipOrgIds = new Set(memberships.map((m) => m.organizationId))
    const syntheticMemberships: UserMembership[] = allOrganizations
      .filter((organization) => !membershipOrgIds.has(organization.id))
      .map((organization) => ({
        organizationId: organization.id,
        organizationType: organization.type,
        organizationName: organization.name,
        organizationIconUrl: organization.branding?.iconUrl ?? null,
        role: Role.ADMIN,
        status: 'ACTIVE',
      }))

    return {
      memberships: [...memberships, ...syntheticMemberships].map(buildMembershipContext),
    }
  })

  // ── GET /auth/context ─────────────────────────────────────────────────────
  // Resolve o AuthenticatedContext completo (membership ativa + disponíveis)
  // para a organização informada em X-Organization-Id.
  fastify.get(
    '/auth/context',
    { preHandler: [authMiddleware, tenantMiddleware] },
    async (request) => request.authContext,
  )

  // ── POST /auth/logout ─────────────────────────────────────────────────────
  // Invalida a sessão no Supabase Auth (server-side).
  // O frontend também deve chamar supabase.auth.signOut() (client-side).
  fastify.post(
    '/auth/logout',
    {
      preHandler: [authMiddleware],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
            required: ['message'],
          },
        },
      },
    },
    async (request, reply) => {
      const authHeader = request.headers.authorization
      const token = authHeader?.slice(7) ?? ''

      try {
        await options.authProvider.signOut(token)
      } catch {
        // Log do erro mas não expor ao cliente — sessão local já foi limpa
        request.log.warn({ userId: request.authIdentity?.id }, 'server-side signOut failed')
      }

      return reply.status(200).send({ message: 'Logout realizado com sucesso.' })
    },
  )
}
