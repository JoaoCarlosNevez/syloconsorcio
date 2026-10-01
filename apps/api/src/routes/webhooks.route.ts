// Webhook público de criação de leads — pra landing pages, formulários e
// ferramentas externas (Zapier, RD Station, n8n...). Documentado pro usuário
// em Configurações > Integrações — mantenha a doc em sincronia
// (apps/web/src/pages/config/IntegracoesSection.tsx).
//
// POST /webhooks/leads
//   Autenticação: header `X-Api-Key: <chave>` (ou `Authorization: Bearer
//   <chave>`). A chave identifica a organização — não há usuário logado nem
//   X-Organization-Id.
//   201 → lead criado · 409 → telefone já cadastrado (devolve o id do lead
//   existente) · 400 → dados inválidos · 401 → chave ausente/inválida/revogada
//   · 429 → limite de requisições estourado.
//
// Rate limit (@fastify/rate-limit, só nesta rota): a chave é resolvida uma vez
// antes do limite (resolveApiKey, reaproveitada no handler). Chave válida →
// WEBHOOK_RATE_LIMIT.perKey por minuto, contado por chave. Sem chave ou chave
// inválida → WEBHOOK_RATE_LIMIT.perIpWithoutKey por minuto, contado por IP — assim
// inventar chaves não escapa do limite e tentativas de adivinhar ficam lentas.
// O contador fica em memória: com mais de uma instância da API, cada uma
// conta separado.

import rateLimit from '@fastify/rate-limit'
import type {
  IActivityLogRepository,
  IApiKeyRepository,
  IFunnelRepository,
  ILeadQueueRepository,
  ILeadRepository,
  IMembershipRepository,
  INotificationRepository,
  LeadRecord,
} from '@sylocrm/application'
import {
  CreateLeadUseCase,
  CreateWebhookLeadUseCase,
  OfferLeadToQueueUseCase,
} from '@sylocrm/application'
import type { ApiKeyRecord } from '@sylocrm/application'
import { ValidationError } from '@sylocrm/domain'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { extractApiKey, hashApiKey } from '../lib/api-keys'

interface WebhooksRouteOptions {
  apiKeyRepository: IApiKeyRepository
  leadRepository: ILeadRepository
  funnelRepository: IFunnelRepository
  membershipRepository: IMembershipRepository
  activityLogRepository: IActivityLogRepository
  notificationRepository: INotificationRepository
  leadQueueRepository: ILeadQueueRepository
}

const webhookLeadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z
    .string()
    .trim()
    .refine((value) => value.replace(/\D/g, '').length >= 8, {
      message: 'Telefone precisa ter pelo menos 8 dígitos.',
    }),
  email: z.string().trim().email().nullable().optional(),
  segment: z.string().trim().max(100).nullable().optional(),
  /** Valor do crédito em reais (ex: 150000 ou 150000.50). */
  value: z
    .number()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER / 100)
    .nullable()
    .optional(),
  quotaCount: z.number().int().positive().nullable().optional(),
  source: z.string().trim().max(100).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  funnelId: z.string().uuid().nullable().optional(),
  assignedUserEmail: z.string().trim().email().nullable().optional(),
})

function serializeLead(lead: LeadRecord) {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    funnelId: lead.funnelId,
    stageId: lead.stageId,
    assignedUserId: lead.assignedUserId,
    createdAt: lead.createdAt.toISOString(),
  }
}

/** Espelhado na documentação (IntegracoesSection.tsx) — mantenha em sincronia. */
export const WEBHOOK_RATE_LIMIT = {
  perKey: 60,
  perIpWithoutKey: 10,
  timeWindowMs: 60_000,
} as const

export const webhooksRoute: FastifyPluginAsync<WebhooksRouteOptions> = async (fastify, options) => {
  // Resultado da busca da chave por requisição — calculado no keyGenerator do
  // rate limit e reaproveitado no handler (uma consulta ao banco só).
  const resolvedKeys = new WeakMap<FastifyRequest, ApiKeyRecord | null>()

  async function resolveApiKey(request: FastifyRequest): Promise<ApiKeyRecord | null> {
    if (resolvedKeys.has(request)) return resolvedKeys.get(request) ?? null
    const key = extractApiKey(request.headers)
    const apiKey = key ? await options.apiKeyRepository.findActiveByHash(hashApiKey(key)) : null
    resolvedKeys.set(request, apiKey)
    return apiKey
  }

  // Registrado dentro deste plugin: o escopo encapsulado do Fastify faz o
  // limite valer só pras rotas daqui.
  await fastify.register(rateLimit, { global: false })

  const createWebhookLead = new CreateWebhookLeadUseCase(
    new CreateLeadUseCase(
      options.leadRepository,
      options.funnelRepository,
      options.activityLogRepository,
    ),
    options.leadRepository,
    options.funnelRepository,
    options.membershipRepository,
    options.notificationRepository,
    // Lead sem responsável vai pra Fila de Leads quando ela está ligada.
    new OfferLeadToQueueUseCase(
      options.leadQueueRepository,
      options.leadRepository,
      options.notificationRepository,
    ),
  )

  // ── POST /webhooks/leads ──────────────────────────────────────────────────
  fastify.post(
    '/webhooks/leads',
    {
      config: {
        rateLimit: {
          timeWindow: WEBHOOK_RATE_LIMIT.timeWindowMs,
          keyGenerator: async (request: FastifyRequest) => {
            const apiKey = await resolveApiKey(request)
            return apiKey ? `key:${apiKey.id}` : `ip:${request.ip}`
          },
          max: async (_request: FastifyRequest, key: string) =>
            key.startsWith('key:') ? WEBHOOK_RATE_LIMIT.perKey : WEBHOOK_RATE_LIMIT.perIpWithoutKey,
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
      const apiKey = await resolveApiKey(request)
      if (!apiKey) {
        return reply.status(401).send({
          error: 'Chave de API ausente, inválida ou revogada.',
          code: 'INVALID_API_KEY',
          status: 401,
        })
      }
      await options.apiKeyRepository.markUsed(apiKey.id, new Date())

      const parsed = webhookLeadSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados inválidos.',
          code: 'VALIDATION_ERROR',
          status: 400,
          details: parsed.error.flatten().fieldErrors,
        })
      }

      const { value, ...fields } = parsed.data
      try {
        const result = await createWebhookLead.execute({
          ...fields,
          organizationId: apiKey.organizationId,
          valueCents: value === null || value === undefined ? null : Math.round(value * 100),
        })

        if (!result.created) {
          return reply.status(409).send({
            error: 'Já existe um lead com este telefone.',
            code: 'LEAD_ALREADY_EXISTS',
            status: 409,
            lead: serializeLead(result.lead),
          })
        }
        return reply.status(201).send({ lead: serializeLead(result.lead) })
      } catch (error) {
        if (error instanceof ValidationError) {
          return reply.status(400).send({
            error: 'Dados inválidos.',
            code: 'VALIDATION_ERROR',
            status: 400,
            details: Object.fromEntries(
              error.issues.map((issue) => [issue.field, [issue.message]]),
            ),
          })
        }
        throw error
      }
    },
  )
}
