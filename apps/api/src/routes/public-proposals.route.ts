// Página pública da proposta — o link que o vendedor manda pro cliente.
//
// GET /public/proposals/:token
//   Sem autenticação: o token (aleatório, gerado em POST
//   /leads/:id/proposals/:proposalId/share) é o que dá acesso. Cada chamada
//   conta como uma abertura e pode avisar o vendedor no sininho — ver
//   ViewSharedProposalUseCase.
//   200 → dados da proposta · 404 → token inexistente · 429 → limite estourado.
//
// Rate limit por IP (@fastify/rate-limit, só nesta rota) pra ninguém ficar
// testando tokens nem inflar a contagem de aberturas. Contador em memória,
// como o do webhook.

import rateLimit from '@fastify/rate-limit'
import type {
  ILeadProposalRepository,
  ILeadRepository,
  INotificationRepository,
  IOrganizationRepository,
  IUserRepository,
} from '@sylocrm/application'
import { ViewSharedProposalUseCase } from '@sylocrm/application'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'

interface PublicProposalsRouteOptions {
  leadProposalRepository: ILeadProposalRepository
  leadRepository: ILeadRepository
  organizationRepository: IOrganizationRepository
  userRepository: IUserRepository
  notificationRepository: INotificationRepository
}

export const PUBLIC_PROPOSAL_RATE_LIMIT = {
  perIp: 30,
  timeWindowMs: 60_000,
} as const

/** Formato do token gerado em DrizzleLeadProposalRepository (base64url). */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/

export const publicProposalsRoute: FastifyPluginAsync<PublicProposalsRouteOptions> = async (
  fastify,
  options,
) => {
  await fastify.register(rateLimit, { global: false })

  const viewSharedProposal = new ViewSharedProposalUseCase(
    options.leadProposalRepository,
    options.leadRepository,
    options.organizationRepository,
    options.userRepository,
    options.notificationRepository,
  )

  fastify.get<{ Params: { token: string } }>(
    '/public/proposals/:token',
    {
      config: {
        rateLimit: {
          max: PUBLIC_PROPOSAL_RATE_LIMIT.perIp,
          timeWindow: PUBLIC_PROPOSAL_RATE_LIMIT.timeWindowMs,
          errorResponseBuilder: (_request: FastifyRequest, context: { ttl: number }) => ({
            statusCode: 429,
            error: 'Limite de requisições atingido. Tente de novo em instantes.',
            code: 'RATE_LIMITED',
            status: 429,
            retryAfterSeconds: Math.ceil(context.ttl / 1000),
          }),
        },
      },
    },
    async (request, reply) => {
      const notFound = {
        error: 'Proposta não encontrada.',
        code: 'PROPOSAL_NOT_FOUND',
        status: 404,
      }
      if (!TOKEN_PATTERN.test(request.params.token)) return reply.status(404).send(notFound)

      const proposal = await viewSharedProposal.execute({
        token: request.params.token,
        now: new Date(),
      })
      if (!proposal) return reply.status(404).send(notFound)
      return proposal
    },
  )
}
