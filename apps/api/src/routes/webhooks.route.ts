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
//   existente) · 400 → dados inválidos · 401 → chave ausente/inválida/revogada.

import type {
  IActivityLogRepository,
  IApiKeyRepository,
  IFunnelRepository,
  ILeadRepository,
  IMembershipRepository,
  INotificationRepository,
  LeadRecord,
} from '@sylocrm/application'
import { CreateLeadUseCase, CreateWebhookLeadUseCase } from '@sylocrm/application'
import { ValidationError } from '@sylocrm/domain'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { extractApiKey, hashApiKey } from '../lib/api-keys'

interface WebhooksRouteOptions {
  apiKeyRepository: IApiKeyRepository
  leadRepository: ILeadRepository
  funnelRepository: IFunnelRepository
  membershipRepository: IMembershipRepository
  activityLogRepository: IActivityLogRepository
  notificationRepository: INotificationRepository
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

export const webhooksRoute: FastifyPluginAsync<WebhooksRouteOptions> = async (fastify, options) => {
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
  )

  // ── POST /webhooks/leads ──────────────────────────────────────────────────
  fastify.post('/webhooks/leads', async (request, reply) => {
    const key = extractApiKey(request.headers)
    const apiKey = key ? await options.apiKeyRepository.findActiveByHash(hashApiKey(key)) : null
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
          details: Object.fromEntries(error.issues.map((issue) => [issue.field, [issue.message]])),
        })
      }
      throw error
    }
  })
}
