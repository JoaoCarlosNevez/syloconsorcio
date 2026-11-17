// GmailUseCases — enviar a ficha de adesão pela conta Gmail do próprio
// usuário (login com Google, só o escopo gmail.send).
//
// Fluxo da conexão: connectUrl() assina um `state` com o usuário e pra onde
// voltar → o Google pede a autorização → a volta (handleCallback) confere o
// state, troca o código pelo token e guarda a conta (token criptografado na
// infraestrutura).
//
// Envio da ficha: só pra administradora cadastrada da organização (os
// destinatários nunca vêm do cliente), do lead que o usuário enxerga, com os
// documentos da adesão anexados. Fica no histórico do lead.

import { ValidationError } from '@sylocrm/domain'
import type { MembershipContext } from '../auth/auth-context'
import { resolveLeadScope } from '../leads/lead-scope'
import { type IActivityLogRepository, NO_OP_ACTIVITY_LOG } from '../ports/activity-log.repository'
import type { IAdministratorRepository } from '../ports/administrator.repository'
import {
  GmailNotConnectedError,
  type GoogleAccountRecord,
  type IGmailGateway,
  type IGoogleAccountRepository,
  type IOAuthStateSigner,
  type MailAttachment,
} from '../ports/gmail.ports'
import type { ILeadAdhesionRepository } from '../ports/lead-adhesion.repository'
import type { ILeadRepository } from '../ports/lead.repository'
import type { IOrganizationRepository } from '../ports/organization.repository'
import { type IStorageProvider, PRIVATE_STORAGE_BUCKETS } from '../ports/storage.provider'

/** Quanto tempo a pessoa tem pra autorizar na tela do Google. */
const STATE_TTL_MS = 10 * 60 * 1000
/** Gmail aceita até 25 MB por e-mail; o MIME (base64) aumenta ~33%. */
export const GMAIL_MAX_ATTACHMENTS_BYTES = 18 * 1024 * 1024
const MAX_SUBJECT_LENGTH = 200
const MAX_BODY_LENGTH = 20_000

export interface SendAdhesionEmailInput {
  userId: string
  membership: MembershipContext
  leadId: string
  administratorId: string
  subject: string
  body: string
}

export type SendAdhesionEmailResult =
  | { ok: true; administratorName: string; to: string[]; attachments: number; from: string }
  | { ok: false; reason: 'not_connected' | 'lead_not_found' | 'administrator_not_found' }

export class GmailUseCases {
  constructor(
    private readonly accounts: IGoogleAccountRepository,
    private readonly gateway: IGmailGateway,
    private readonly stateSigner: IOAuthStateSigner,
    private readonly leadRepository: ILeadRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly administrators: Pick<IAdministratorRepository, 'list'>,
    private readonly adhesions: Pick<ILeadAdhesionRepository, 'listDocuments'>,
    private readonly storage: Pick<IStorageProvider, 'downloadPrivateFile'>,
    private readonly activityLog: IActivityLogRepository = NO_OP_ACTIVITY_LOG,
  ) {}

  // ── Conexão ───────────────────────────────────────────────────────────────

  status(userId: string): Promise<GoogleAccountRecord | null> {
    return this.accounts.find(userId)
  }

  connectUrl(userId: string, returnTo: string, now: Date = new Date()): string {
    const state = this.stateSigner.sign({
      userId,
      returnTo,
      expiresAt: new Date(now.getTime() + STATE_TTL_MS),
    })
    return this.gateway.authorizationUrl(state)
  }

  /** Volta do Google. Retorna pra onde mandar o navegador; null = state
   * inválido/vencido (não dá nem pra saber pra onde voltar). */
  async handleCallback(
    input: { code: string | null; state: string; error: string | null },
    now: Date = new Date(),
  ): Promise<{ returnTo: string; connected: boolean } | null> {
    const claims = this.stateSigner.verify(input.state, now)
    if (!claims) return null
    if (input.error || !input.code) return { returnTo: claims.returnTo, connected: false }
    const account = await this.gateway.exchangeCode(input.code)
    await this.accounts.save({ userId: claims.userId, ...account })
    return { returnTo: claims.returnTo, connected: true }
  }

  async disconnect(userId: string): Promise<void> {
    const token = await this.accounts.findRefreshToken(userId)
    await this.accounts.remove(userId)
    if (!token) return
    try {
      await this.gateway.revoke(token)
    } catch (error) {
      // A conexão já foi apagada aqui; revogar no Google é só limpeza.
      console.warn('Falha ao revogar o token do Google', error)
    }
  }

  // ── Envio da ficha ────────────────────────────────────────────────────────

  async sendAdhesion(input: SendAdhesionEmailInput): Promise<SendAdhesionEmailResult> {
    const subject = input.subject.trim()
    const body = input.body.trim()
    if (!subject || subject.length > MAX_SUBJECT_LENGTH) {
      throw new ValidationError([{ field: 'subject', message: 'Assunto inválido.' }])
    }
    if (!body || body.length > MAX_BODY_LENGTH) {
      throw new ValidationError([{ field: 'body', message: 'Corpo do e-mail inválido.' }])
    }

    const account = await this.accounts.find(input.userId)
    const refreshToken = account ? await this.accounts.findRefreshToken(input.userId) : null
    if (!account || !refreshToken) return { ok: false, reason: 'not_connected' }

    const scope = await resolveLeadScope(
      input.membership,
      input.userId,
      this.organizationRepository,
    )
    const lead = await this.leadRepository.findById(input.leadId, scope)
    if (!lead) return { ok: false, reason: 'lead_not_found' }

    const administrators = await this.administrators.list(input.membership.organizationId)
    const administrator = administrators.find((item) => item.id === input.administratorId)
    if (!administrator || administrator.emails.length === 0) {
      return { ok: false, reason: 'administrator_not_found' }
    }

    const attachments = await this.attachmentsFor(lead.id)

    try {
      await this.gateway.send(refreshToken, {
        to: administrator.emails,
        subject,
        text: body,
        attachments,
      })
    } catch (error) {
      if (error instanceof GmailNotConnectedError) {
        // Token morto: apaga pra tela mostrar "Conectar Gmail" de novo.
        await this.accounts.remove(input.userId)
        return { ok: false, reason: 'not_connected' }
      }
      throw error
    }

    await this.activityLog.record({
      organizationId: lead.organizationId,
      actorUserId: input.userId,
      action: 'lead.adhesion_emailed',
      entityType: 'lead',
      entityId: lead.id,
      entityLabel: lead.name,
      metadata: {
        administrator: administrator.name,
        to: administrator.emails.join(', '),
        from: account.googleEmail,
        attachments: attachments.length,
      },
    })

    return {
      ok: true,
      administratorName: administrator.name,
      to: administrator.emails,
      attachments: attachments.length,
      from: account.googleEmail,
    }
  }

  private async attachmentsFor(leadId: string): Promise<MailAttachment[]> {
    const documents = await this.adhesions.listDocuments(leadId)
    const attachments: MailAttachment[] = []
    let total = 0
    for (const document of documents) {
      const data = await this.storage.downloadPrivateFile({
        bucket: PRIVATE_STORAGE_BUCKETS.leadDocuments,
        path: document.storagePath,
      })
      total += data.length
      if (total > GMAIL_MAX_ATTACHMENTS_BYTES) {
        throw new ValidationError([
          {
            field: 'attachments',
            message:
              'Os documentos passam do limite do Gmail (cerca de 18 MB). Envie pelo seu e-mail e anexe à mão.',
          },
        ])
      }
      attachments.push({ filename: document.fileName, contentType: document.contentType, data })
    }
    return attachments
  }
}
