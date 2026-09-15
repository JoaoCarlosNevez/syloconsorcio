// tenantMiddleware — resolve contexto organizacional e constrói AuthenticatedContext.
//
// Deve rodar DEPOIS do authMiddleware (depende de request.authIdentity).
//
// ADR-12 (seção 5):
//   - Lê X-Organization-Id header
//   - Busca membership do usuário no banco
//   - Valida que a organização pertence ao usuário autenticado
//   - Calcula DataScope e Permissions
//   - Constrói e injeta request.authContext
//
// Super Admin da plataforma (users.isPlatformAdmin) enxerga qualquer
// organização mesmo sem membership real nela — nesse caso a organização é
// buscada direto e uma membership ADMIN é sintetizada (nunca persistida).
// Quando o Super Admin TEM uma membership real na organização, o Role real
// prevalece — a sintética é só um fallback pra quando não há vínculo algum.
//
// Erros:
//   400 — X-Organization-Id ausente (TENANT_HEADER_MISSING)
//   403 — membership não encontrada nem sintetizável (MEMBERSHIP_NOT_FOUND)
//   403 — membership inativa/suspensa (MEMBERSHIP_INACTIVE)

import type {
  AuthenticatedContext,
  IMembershipRepository,
  IOrganizationRepository,
  IUserRepository,
  UserMembership,
} from '@sylocrm/application'
import { Role } from '@sylocrm/domain'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { AuthErrorCode } from '../auth/errors'
import { buildMembershipContext } from '../auth/membership-context'

/**
 * Cria o preHandler de tenant com os repositórios necessários injetados.
 *
 * Deve ser registrado APÓS createAuthMiddleware na chain de preHandlers.
 *
 * @example
 * const tenantHandler = createTenantMiddleware(membershipRepo, userRepo, organizationRepo)
 */
export function createTenantMiddleware(
  membershipRepository: IMembershipRepository,
  userRepository: IUserRepository,
  organizationRepository: IOrganizationRepository,
) {
  return async function tenantMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // authMiddleware deve ter rodado antes
    const identity = request.authIdentity
    if (!identity) {
      return reply.status(401).send({
        error: 'Identidade não resolvida. authMiddleware deve preceder tenantMiddleware.',
        code: AuthErrorCode.TOKEN_MISSING,
        status: 401,
      })
    }

    const organizationId = request.headers['x-organization-id']
    if (!organizationId || typeof organizationId !== 'string') {
      return reply.status(400).send({
        error: 'Header X-Organization-Id é obrigatório para rotas de negócio.',
        code: AuthErrorCode.TENANT_HEADER_MISSING,
        status: 400,
      })
    }

    // Busca membership específica — valida que o usuário pertence à organização
    let currentMembershipData = await membershipRepository.findActiveByUserAndOrganization(
      identity.id,
      organizationId,
    )

    // Sem membership real: Super Admin ainda assim acessa, com ADMIN sintético
    if (!currentMembershipData) {
      const user = await userRepository.findById(identity.id)
      if (user?.isPlatformAdmin) {
        const organization = await organizationRepository.findById(organizationId)
        if (organization) {
          currentMembershipData = {
            organizationId: organization.id,
            organizationType: organization.type,
            organizationName: organization.name,
            organizationIconUrl: organization.branding?.iconUrl ?? null,
            role: Role.ADMIN,
            status: 'ACTIVE',
          } satisfies UserMembership
        }
      }
    }

    if (!currentMembershipData) {
      return reply.status(403).send({
        error: 'Acesso negado. Você não possui membership ativa nesta organização.',
        code: AuthErrorCode.MEMBERSHIP_NOT_FOUND,
        status: 403,
      })
    }

    if (currentMembershipData.status !== 'ACTIVE') {
      return reply.status(403).send({
        error: 'Membership suspensa ou inativa.',
        code: AuthErrorCode.MEMBERSHIP_INACTIVE,
        status: 403,
      })
    }

    // Busca todas as memberships para disponibilizar troca de contexto no frontend
    const allMemberships = await membershipRepository.findActiveByUserId(identity.id)

    const authContext: AuthenticatedContext = {
      identityId: identity.id,
      userId: identity.id,
      currentMembership: buildMembershipContext(currentMembershipData),
      availableMemberships: allMemberships.map(buildMembershipContext),
    }

    request.authContext = authContext
  }
}
