// CreateWebhookLeadUseCase — cria um lead recebido pelo webhook
// (POST /webhooks/leads), autenticado por uma chave de API da organização.
//
// Diferente do POST /leads, não há usuário logado, então este use case
// resolve o que a tela resolveria:
//   - funil: o informado (precisa ser da organização) ou o funil padrão;
//   - responsável: o membro ativo com o e-mail informado, ou ninguém;
//   - telefone repetido não é erro de validação: devolve o lead que já existe
//     (`created: false`), pra quem integra poder tratar como "já cadastrado".
// O resto (primeiro estágio, log de atividades) é o CreateLeadUseCase.
//
// Depois de criar, avisa no sininho ('lead.received'): o responsável, se
// houver; senão, Dono e Supervisores ativos — quem distribui os leads.

import { Role, ValidationError } from '@sylocrm/domain'
import type { IFunnelRepository } from '../ports/funnel.repository'
import type { ILeadRepository, LeadRecord } from '../ports/lead.repository'
import type { IMembershipRepository, TeamMember } from '../ports/membership.repository'
import { type INotificationRepository, NO_OP_NOTIFICATIONS } from '../ports/notification.repository'
import type { UseCase } from '../ports/use-case'
import type { CreateLeadUseCase } from './create-lead.use-case'

/** Usados quando o webhook não informa segmento/origem. */
export const WEBHOOK_DEFAULT_SEGMENT = 'Não informado'
export const WEBHOOK_DEFAULT_SOURCE = 'Webhook'

/** Quem é avisado de um lead que chegou sem responsável. */
const DISTRIBUTOR_ROLES: ReadonlySet<Role> = new Set([Role.ADMIN, Role.MANAGER])

export interface CreateWebhookLeadInput {
  organizationId: string
  name: string
  phone: string
  email?: string | null
  segment?: string | null
  valueCents?: number | null
  quotaCount?: number | null
  source?: string | null
  notes?: string | null
  funnelId?: string | null
  assignedUserEmail?: string | null
}

export interface CreateWebhookLeadOutput {
  created: boolean
  lead: LeadRecord
}

export class CreateWebhookLeadUseCase
  implements UseCase<CreateWebhookLeadInput, CreateWebhookLeadOutput>
{
  constructor(
    private readonly createLead: CreateLeadUseCase,
    private readonly leadRepository: ILeadRepository,
    private readonly funnelRepository: IFunnelRepository,
    private readonly membershipRepository: IMembershipRepository,
    private readonly notifications: INotificationRepository = NO_OP_NOTIFICATIONS,
  ) {}

  async execute(input: CreateWebhookLeadInput): Promise<CreateWebhookLeadOutput> {
    const existing = await this.leadRepository.findByPhone(input.organizationId, input.phone)
    if (existing) return { created: false, lead: existing }

    const funnelId = input.funnelId ?? (await this.resolveDefaultFunnelId(input.organizationId))
    const members = await this.membershipRepository.findActiveByOrganizationId(input.organizationId)
    const activeMembers = members.filter((m) => m.status === 'ACTIVE')
    const assignedUserId = input.assignedUserEmail
      ? this.resolveAssignee(activeMembers, input.assignedUserEmail)
      : null

    const lead = await this.createLead.execute({
      organizationId: input.organizationId,
      funnelId,
      assignedUserId,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      segment: input.segment?.trim() || WEBHOOK_DEFAULT_SEGMENT,
      valueCents: input.valueCents ?? 0,
      ...(input.quotaCount ? { quotaCount: input.quotaCount } : {}),
      source: input.source?.trim() || WEBHOOK_DEFAULT_SOURCE,
      notes: input.notes ?? null,
    })

    const recipients = lead.assignedUserId
      ? [lead.assignedUserId]
      : activeMembers.filter((m) => DISTRIBUTOR_ROLES.has(m.role)).map((m) => m.userId)
    for (const userId of recipients) {
      await this.notifications.notify({
        organizationId: lead.organizationId,
        userId,
        actorUserId: null,
        type: 'lead.received',
        taskId: null,
        title: lead.name,
        metadata: {
          leadId: lead.id,
          funnelId: lead.funnelId,
          source: lead.source,
          assignedToYou: lead.assignedUserId === userId,
        },
      })
    }

    return { created: true, lead }
  }

  private async resolveDefaultFunnelId(organizationId: string): Promise<string> {
    const funnels = await this.funnelRepository.listByOrganization(organizationId)
    const funnel = funnels.find((f) => f.isDefault) ?? funnels[0]
    if (!funnel) {
      throw new ValidationError([
        { field: 'funnelId', message: 'A organização não tem nenhum funil.' },
      ])
    }
    return funnel.id
  }

  private resolveAssignee(activeMembers: TeamMember[], email: string): string {
    const normalized = email.trim().toLowerCase()
    const member = activeMembers.find((m) => m.email.toLowerCase() === normalized)
    if (!member) {
      throw new ValidationError([
        {
          field: 'assignedUserEmail',
          message: 'Nenhum membro ativo da organização com este e-mail.',
        },
      ])
    }
    return member.userId
  }
}
