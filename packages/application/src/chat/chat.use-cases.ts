// ChatUseCases — chat interno entre vendas, ADM e pós-venda.
//
// Quem vê o quê:
//   - conversa de cliente: quem enxerga algum lead do cliente (mesmo
//     DataScope de leads — o Vendedor vê a dos clientes dele, ADM/Pós-venda/
//     Supervisor/Dono conforme o alcance que já têm). Nenhuma permissão nova.
//   - conversa direta: só as duas pessoas.
//
// Quem é avisado de uma mensagem nova (push 'chat.message' + contador do
// menu Chat), fora quem escreveu:
//   - direta: a outra pessoa;
//   - cliente: quem já participa, os responsáveis pelos leads do cliente e a
//     equipe do setor do funil onde o cliente está (ADM → setor ADM,
//     Pós-venda → setor Pós-venda; Vendedores ficam de fora, eles só veem os
//     próprios clientes).
//
// Tarefa pela conversa: vai pra uma pessoa ou pra fila de um setor, sem prazo
// por padrão, tipo "Pendência", ligada ao lead do cliente. Qualquer um pode
// pedir pra qualquer um (é um pedido, não uma atribuição de gestor). Quem
// recebe é avisado pela notificação normal de tarefa — a mensagem da tarefa
// não gera push de chat (seria aviso em dobro).

import { DataScope, type MemberSector, Role, ValidationError } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import { type LeadScope, resolveLeadScope } from '../leads/lead-scope'
import type {
  ChatClientLead,
  ChatConversationRecord,
  ChatConversationSummary,
  ChatMessageRecord,
  IChatRepository,
} from '../ports/chat.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IMembershipRepository, TeamMember } from '../ports/membership.repository'
import { type INotificationRepository, NO_OP_NOTIFICATIONS } from '../ports/notification.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import type { CreateTaskUseCase } from '../tasks/create-task.use-case'

/** Tamanho máximo de uma mensagem. */
export const CHAT_MESSAGE_MAX_LENGTH = 4000
/** Trecho da mensagem que vai no push. */
const PREVIEW_LENGTH = 140
const PAGE_SIZE = 50

/** Setor que acompanha o cliente quando ele está num funil do sistema. */
const SECTOR_BY_FUNNEL_KIND: Record<string, MemberSector> = {
  BACKOFFICE: 'adm',
  POST_SALE: 'pos_venda',
}

interface Actor {
  userId: string
  membership: MembershipContext
}

interface Access {
  conversation: ChatConversationRecord
  /** Leads do cliente que o usuário enxerga (vazio na direta). */
  visibleLeads: ChatClientLead[]
  /** Todos os leads do cliente (vazio na direta). */
  clientLeads: ChatClientLead[]
}

export interface CreateChatTaskInput extends Actor {
  conversationId: string
  title: string
  notes?: string | null
  /** Uma pessoa ou um setor (não os dois). */
  assignedUserId?: string | null
  assignedSector?: MemberSector | null
  dueAt?: Date | null
}

/** Lead visível no escopo — mesma regra das queries de leads
 * (buildScopeConditions em DrizzleLeadRepository). */
export function isLeadInScope(
  lead: Pick<ChatClientLead, 'organizationId' | 'assignedUserId'>,
  scope: LeadScope,
): boolean {
  if (!scope.organizationIds.includes(lead.organizationId)) return false
  if (scope.assignedUserId && lead.assignedUserId !== scope.assignedUserId) return false
  if (scope.teamUserIds) {
    return lead.assignedUserId === null || scope.teamUserIds.includes(lead.assignedUserId)
  }
  return true
}

/** Chave da conversa direta: os dois ids em ordem. */
export function directKeyFor(a: string, b: string): string {
  return [a, b].sort().join(':')
}

function validBody(raw: string): string {
  const body = raw.trim()
  if (!body) throw new ValidationError([{ field: 'body', message: 'Mensagem vazia.' }])
  if (body.length > CHAT_MESSAGE_MAX_LENGTH) {
    throw new ValidationError([
      { field: 'body', message: `Mensagem passa de ${CHAT_MESSAGE_MAX_LENGTH} caracteres.` },
    ])
  }
  return body
}

function preview(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  return flat.length > PREVIEW_LENGTH ? `${flat.slice(0, PREVIEW_LENGTH - 1)}…` : flat
}

export class ChatUseCases {
  constructor(
    private readonly chat: IChatRepository,
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly membershipRepository: Pick<
      IMembershipRepository,
      'findActiveByOrganizationId'
    >,
    private readonly createTask: CreateTaskUseCase,
    private readonly notifications: INotificationRepository = NO_OP_NOTIFICATIONS,
  ) {}

  // ── Abrir conversa ────────────────────────────────────────────────────────

  /** Conversa do cliente de um lead (cria na primeira vez). null = lead fora
   * do alcance do usuário. */
  async openClient(input: Actor & { leadId: string }): Promise<ChatConversationSummary | null> {
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null
    const conversation = await this.chat.findOrCreateClientConversation(
      lead.organizationId,
      lead.clientId ?? lead.id,
    )
    return this.chat.summarize(conversation.id, input.userId)
  }

  /** Conversa direta com outro membro ativo da organização. */
  async openDirect(input: Actor & { otherUserId: string }): Promise<ChatConversationSummary> {
    if (input.otherUserId === input.userId) {
      throw new ValidationError([{ field: 'userId', message: 'Escolha outra pessoa.' }])
    }
    const organizationId = input.membership.organizationId
    const members = await this.membershipRepository.findActiveByOrganizationId(organizationId)
    if (!members.some((member) => member.userId === input.otherUserId)) {
      throw new ValidationError([{ field: 'userId', message: 'Pessoa não está na equipe.' }])
    }
    const conversation = await this.chat.findOrCreateDirectConversation(
      organizationId,
      directKeyFor(input.userId, input.otherUserId),
    )
    await this.chat.addParticipants(conversation.id, [input.userId, input.otherUserId])
    const summary = await this.chat.summarize(conversation.id, input.userId)
    if (!summary) throw new Error('Conversa direta sumiu logo depois de criada.')
    return summary
  }

  // ── Listas ────────────────────────────────────────────────────────────────

  async list(input: Actor): Promise<ChatConversationSummary[]> {
    const all = await this.chat.listForUser(input.userId, input.membership.organizationId)
    if (!hasRestrictedScope(input.membership)) return all
    // Vendedor/Supervisor com time: o lead pode ter mudado de dono depois que
    // a pessoa entrou na conversa — só lista a que ela ainda enxerga.
    const visible: ChatConversationSummary[] = []
    for (const summary of all) {
      if (await this.access(summary.conversation.id, input)) visible.push(summary)
    }
    return visible
  }

  async unreadCount(input: Actor): Promise<number> {
    if (!hasRestrictedScope(input.membership)) {
      return this.chat.countUnreadConversations(input.userId, input.membership.organizationId)
    }
    const visible = await this.list(input)
    return visible.filter((summary) => summary.unreadCount > 0).length
  }

  /** null = conversa não existe ou o usuário não pode ver. */
  async summary(
    input: Actor & { conversationId: string },
  ): Promise<ChatConversationSummary | null> {
    const access = await this.access(input.conversationId, input)
    if (!access) return null
    return this.chat.summarize(input.conversationId, input.userId)
  }

  async messages(
    input: Actor & { conversationId: string; before?: Date },
  ): Promise<ChatMessageRecord[] | null> {
    const access = await this.access(input.conversationId, input)
    if (!access) return null
    return this.chat.listMessages(input.conversationId, { limit: PAGE_SIZE, before: input.before })
  }

  async markRead(input: Actor & { conversationId: string }): Promise<boolean> {
    const access = await this.access(input.conversationId, input)
    if (!access) return false
    await this.chat.markRead(input.conversationId, input.userId, new Date())
    return true
  }

  // ── Mensagens ─────────────────────────────────────────────────────────────

  async send(
    input: Actor & { conversationId: string; body: string },
  ): Promise<ChatMessageRecord | null> {
    const body = validBody(input.body)
    const access = await this.access(input.conversationId, input)
    if (!access) return null
    return this.post(access, input.userId, body, null)
  }

  /** Mensagem direta pra alguém, de dentro da ficha de um cliente: cai na
   * conversa direta entre os dois, com o cliente anexado (card "abrir
   * ficha"). null = lead fora do alcance de quem manda. */
  async sendDirectAboutLead(
    input: Actor & { otherUserId: string; leadId: string; body: string },
  ): Promise<{ conversationId: string; message: ChatMessageRecord } | null> {
    const body = validBody(input.body)
    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return null

    const summary = await this.openDirect({ ...input, otherUserId: input.otherUserId })
    const access = await this.access(summary.conversation.id, input)
    if (!access) return null
    const message = await this.post(access, input.userId, body, { id: lead.id, name: lead.name })
    return { conversationId: summary.conversation.id, message }
  }

  /** Grava a mensagem, atualiza quem acompanha e avisa por push. */
  private async post(
    access: Access,
    authorId: string,
    body: string,
    lead: { id: string; name: string } | null,
  ): Promise<ChatMessageRecord> {
    const conversationId = access.conversation.id
    const message = await this.chat.addMessage({
      conversationId,
      authorUserId: authorId,
      kind: 'text',
      body,
      leadId: lead?.id ?? null,
    })

    const recipients = await this.recipients(access, authorId)
    await this.chat.addParticipants(conversationId, [authorId, ...recipients])
    await this.chat.markRead(conversationId, authorId, message.createdAt)

    const clientName = lead?.name ?? access.clientLeads[0]?.name ?? null
    for (const userId of recipients) {
      await this.notifications.notify({
        organizationId: access.conversation.organizationId,
        userId,
        actorUserId: authorId,
        type: 'chat.message',
        taskId: null,
        title: clientName ?? message.author?.name ?? message.author?.email ?? 'Mensagem',
        metadata: {
          conversationId,
          clientName,
          preview: lead ? preview(`Sobre ${lead.name}: ${body}`) : preview(body),
        },
      })
    }
    return message
  }

  /** Cria a tarefa e a mensagem com o card dela. null = sem acesso. */
  async createTaskFromChat(input: CreateChatTaskInput): Promise<ChatMessageRecord | null> {
    const title = input.title.trim()
    if (!title) throw new ValidationError([{ field: 'title', message: 'Diga o que precisa.' }])
    const assignedSector = input.assignedSector ?? null
    const assignedUserId = assignedSector ? null : (input.assignedUserId ?? null)
    if (!assignedSector && !assignedUserId) {
      throw new ValidationError([
        { field: 'assignedUserId', message: 'Escolha uma pessoa ou um setor.' },
      ])
    }
    const access = await this.access(input.conversationId, input)
    if (!access) return null

    const organizationId = access.conversation.organizationId
    const members = await this.membershipRepository.findActiveByOrganizationId(organizationId)
    if (assignedUserId && !members.some((member) => member.userId === assignedUserId)) {
      throw new ValidationError([
        { field: 'assignedUserId', message: 'Pessoa não está na equipe.' },
      ])
    }

    const task = await this.createTask.execute({
      userId: input.userId,
      membership: input.membership,
      // O lead mais recente do cliente que quem pede enxerga.
      leadId: access.visibleLeads[0]?.id ?? null,
      assignedUserId,
      assignedSector,
      type: 'Pendência',
      title,
      notes: input.notes?.trim() || null,
      dueAt: input.dueAt ?? null,
    })

    const message = await this.chat.addMessage({
      conversationId: input.conversationId,
      authorUserId: input.userId,
      kind: 'task',
      body: title,
      taskId: task.id,
    })
    // Quem recebe a tarefa passa a acompanhar a conversa — se enxerga o
    // cliente (um Vendedor do setor que não é dono do cliente recebe a tarefa,
    // mas não a conversa).
    const assignees = members
      .filter((member) =>
        assignedUserId
          ? member.userId === assignedUserId
          : assignedSector !== null && member.sectors.includes(assignedSector),
      )
      .filter((member) => canFollow(member, access))
      .map((member) => member.userId)
    await this.chat.addParticipants(input.conversationId, [input.userId, ...assignees])
    await this.chat.markRead(input.conversationId, input.userId, message.createdAt)
    return message
  }

  // ── Regras internas ───────────────────────────────────────────────────────

  private async access(conversationId: string, actor: Actor): Promise<Access | null> {
    const conversation = await this.chat.findById(conversationId)
    if (!conversation) return null

    if (conversation.kind === 'direct') {
      if (conversation.organizationId !== actor.membership.organizationId) return null
      const participant = await this.chat.isParticipant(conversationId, actor.userId)
      return participant ? { conversation, visibleLeads: [], clientLeads: [] } : null
    }

    if (!conversation.clientId) return null
    const scope = await resolveLeadScope(
      actor.membership,
      actor.userId,
      this.organizationRepository,
    )
    const clientLeads = await this.chat.listClientLeads(
      conversation.organizationId,
      conversation.clientId,
    )
    const visibleLeads = clientLeads.filter((lead) => isLeadInScope(lead, scope))
    return visibleLeads.length > 0 ? { conversation, visibleLeads, clientLeads } : null
  }

  private async recipients(access: Access, authorId: string): Promise<string[]> {
    const participantIds = await this.chat.listParticipantIds(access.conversation.id)
    if (access.conversation.kind === 'direct') {
      return participantIds.filter((id) => id !== authorId)
    }

    const members = await this.membershipRepository.findActiveByOrganizationId(
      access.conversation.organizationId,
    )
    const sectors = new Set(
      access.clientLeads.flatMap((lead) => {
        const sector = SECTOR_BY_FUNNEL_KIND[lead.funnelKind]
        return sector ? [sector] : []
      }),
    )
    const owners = new Set(access.clientLeads.map((lead) => lead.assignedUserId))
    const ids = members
      .filter(
        (member) =>
          participantIds.includes(member.userId) ||
          owners.has(member.userId) ||
          member.sectors.some((sector) => sectors.has(sector)),
      )
      // Só quem enxerga o cliente: Vendedor só se é dono de um lead dele.
      .filter((member) => canFollow(member, access))
      .map((member) => member.userId)
    return ids.filter((id) => id !== authorId)
  }
}

/** Vendedor ou Supervisor com time: enxerga só parte dos leads. */
function hasRestrictedScope(membership: MembershipContext): boolean {
  return (
    membership.dataScope === DataScope.OWN ||
    (membership.teamUserIds !== undefined && membership.teamUserIds.length > 0)
  )
}

/** Pode acompanhar a conversa do cliente: quem não é Vendedor enxerga os
 * leads da organização; o Vendedor, só se é dono de um lead do cliente. */
function canFollow(member: TeamMember, access: Access): boolean {
  if (access.conversation.kind === 'direct') return true
  if (member.role !== Role.SELLER) return true
  return access.clientLeads.some((lead) => lead.assignedUserId === member.userId)
}
