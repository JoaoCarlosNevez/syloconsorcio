// tenantMiddleware — resolve contexto organizacional e constrói AuthenticatedContext.
//
// Deve rodar DEPOIS do authMiddleware (depende de request.authIdentity).
//
// ADR-06 (seção 5):
//   - Lê X-Organization-Id header
//   - Busca membership do usuário no banco
//   - Valida que a organização pertence ao usuário autenticado
//   - Calcula DataScope e Permissions
//   - Constrói e injeta request.authContext
//
// Super Admin da plataforma (users.isPlatformAdmin) enxerga qualquer
// organização mesmo sem membership real nela — nesse caso a organização é
// buscada direto e uma membership ADMIN é sintetizada (nunca persistida).
// O mesmo vale pro membro de um Master nas Representações ligadas a ele.
// Quando há membership real na organização, o Role real prevalece — a
// sintética é só um fallback pra quando não há vínculo algum.
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
} from '@sylocrm/application'
import { Role } from '@sylocrm/domain'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { AuthErrorCode } from '../auth/errors'
import { buildMembershipContext } from '../auth/membership-context'
import { isInMasterNetwork, synthesizeOwnerMembership } from '../auth/synthetic-membership'

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

    // Disparada em paralelo com a busca abaixo — não depende do resultado dela,
    // e cada query paga uma rodada de rede inteira até o banco (ADR-02: Supabase
    // fica longe do ambiente de dev), então evitar serializar as duas economiza
    // uma rodada inteira em toda rota de negócio.
    const allMembershipsPromise = membershipRepository.findActiveByUserId(identity.id)
    // Os returns 403 abaixo não aguardam essa promise — sem isto, uma rejeição
    // dela viraria unhandledRejection nesses caminhos.
    allMembershipsPromise.catch(() => {})

    // Busca membership específica — valida que o usuário pertence à organização
    let currentMembershipData = await membershipRepository.findActiveByUserAndOrganization(
      identity.id,
      organizationId,
    )

    // Sem membership real: Super Admin (qualquer organização) e membro do Master
    // (Representações da rede dele) ainda assim acessam, como Dono sintético
    if (!currentMembershipData) {
      const [user, organization] = await Promise.all([
        userRepository.findById(identity.id),
        organizationRepository.findById(organizationId),
      ])
      if (
        organization &&
        (user?.isPlatformAdmin || isInMasterNetwork(organization, await allMembershipsPromise))
      ) {
        currentMembershipData = synthesizeOwnerMembership(organization)
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
    // (disparada em paralelo lá em cima — só aguarda aqui)
    const allMemberships = await allMembershipsPromise

    // Supervisor com time (Vendedores ligados a ele) passa a enxergar só o
    // time — ver resolveLeadScope. Sem time, nada muda.
    const currentMembership = buildMembershipContext(currentMembershipData)
    if (currentMembership.role === Role.MANAGER) {
      const teamUserIds = await membershipRepository.findTeamUserIds(
        currentMembership.organizationId,
        identity.id,
      )
      if (teamUserIds.length > 0) currentMembership.teamUserIds = teamUserIds
    }

    const authContext: AuthenticatedContext = {
      identityId: identity.id,
      userId: identity.id,
      currentMembership,
      availableMemberships: allMemberships.map(buildMembershipContext),
    }

    request.authContext = authContext
  }
}
