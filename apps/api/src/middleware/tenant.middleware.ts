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
// Erros:
//   400 — X-Organization-Id ausente (TENANT_HEADER_MISSING)
//   403 — membership não encontrada (MEMBERSHIP_NOT_FOUND)
//   403 — membership inativa/suspensa (MEMBERSHIP_INACTIVE)

import type { IMembershipRepository } from '@sylocrm/application'
import type { AuthenticatedContext } from '@sylocrm/application'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { AuthErrorCode } from '../auth/errors'
import { buildMembershipContext } from '../auth/membership-context'

/**
 * Cria o preHandler de tenant com o repositório de memberships injetado.
 *
 * Deve ser registrado APÓS createAuthMiddleware na chain de preHandlers.
 *
 * @example
 * const tenantHandler = createTenantMiddleware(drizzleMembershipRepo)
 */
export function createTenantMiddleware(membershipRepository: IMembershipRepository) {
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
    const currentMembershipData = await membershipRepository.findActiveByUserAndOrganization(
      identity.id,
      organizationId,
    )

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
