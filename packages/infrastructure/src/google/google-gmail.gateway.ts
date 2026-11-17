// GoogleGmailGateway — OAuth do Google + envio pela API do Gmail, com fetch
// (sem SDK). Escopos: openid + email (saber qual conta conectou) e
// gmail.send (só enviar — o CRM não lê a caixa de entrada).
//
// Envio: monta a mensagem MIME (texto + anexos em base64) e manda pelo
// endpoint de upload do Gmail (aceita mensagens grandes, até ~35 MB). O Gmail
// preenche o remetente com a conta conectada e guarda em Enviados.

import { randomBytes } from 'node:crypto'
import {
  GmailNotConnectedError,
  type IGmailGateway,
  type MailAttachment,
  type OutgoingMail,
} from '@sylocrm/application'

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send'
const SCOPES = ['openid', 'email', GMAIL_SEND_SCOPE]

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const SEND_URL =
  'https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media'

export interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  /** https://<api>/integrations/google/callback — igual ao cadastrado no Google. */
  redirectUri: string
}

/** Cabeçalho com acento: RFC 2047 ("=?UTF-8?B?...?="). */
function encodeHeader(value: string): string {
  return /^[\x20-\x7e]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

/** Base64 quebrado em linhas de 76 (exigência do MIME). */
function base64Lines(data: Buffer): string {
  return (
    data
      .toString('base64')
      .match(/.{1,76}/g)
      ?.join('\r\n') ?? ''
  )
}

/** Nome de arquivo seguro pro cabeçalho (sem aspas nem quebra de linha). */
function safeFilename(name: string): string {
  return name.replace(/["\r\n\\]/g, '_')
}

/** Mensagem MIME multipart com o texto e os anexos. Exportada pros testes. */
export function buildMimeMessage(
  mail: OutgoingMail,
  boundary = randomBytes(12).toString('hex'),
): string {
  const lines = [
    `To: ${mail.to.join(', ')}`,
    `Subject: ${encodeHeader(mail.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines(Buffer.from(mail.text, 'utf8')),
  ]
  for (const attachment of mail.attachments as MailAttachment[]) {
    const filename = encodeHeader(safeFilename(attachment.filename))
    lines.push(
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${filename}"`,
      `Content-Disposition: attachment; filename="${filename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      base64Lines(attachment.data),
    )
  }
  lines.push(`--${boundary}--`, '')
  return lines.join('\r\n')
}

interface TokenResponse {
  access_token?: string
  refresh_token?: string
  scope?: string
  error?: string
  error_description?: string
}

export class GoogleGmailGateway implements IGmailGateway {
  constructor(private readonly config: GoogleOAuthConfig) {}

  authorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      // offline + consent: o Google sempre devolve o refresh token.
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    })
    return `${AUTH_URL}?${params.toString()}`
  }

  private async token(body: Record<string, string>): Promise<TokenResponse> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        ...body,
      }),
    })
    const json = (await response.json()) as TokenResponse
    if (!response.ok) {
      if (json.error === 'invalid_grant') throw new GmailNotConnectedError()
      throw new Error(
        `Google recusou o token: ${json.error ?? response.status} ${json.error_description ?? ''}`,
      )
    }
    return json
  }

  async exchangeCode(code: string) {
    const token = await this.token({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
    })
    const scopes = token.scope ?? ''
    if (!token.access_token || !token.refresh_token) {
      throw new Error('O Google não devolveu o token de acesso.')
    }
    if (!scopes.split(' ').includes(GMAIL_SEND_SCOPE)) {
      throw new Error('A permissão de enviar e-mail não foi concedida.')
    }
    const response = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })
    const info = (await response.json()) as { email?: string }
    if (!response.ok || !info.email) {
      throw new Error('Não foi possível ler o e-mail da conta Google.')
    }
    return { googleEmail: info.email, refreshToken: token.refresh_token, scopes }
  }

  async send(refreshToken: string, mail: OutgoingMail): Promise<void> {
    const { access_token: accessToken } = await this.token({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
    if (!accessToken) throw new GmailNotConnectedError()
    const response = await fetch(SEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'message/rfc822' },
      body: buildMimeMessage(mail),
    })
    if (response.status === 401 || response.status === 403) {
      throw new GmailNotConnectedError()
    }
    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`Gmail recusou o envio (${response.status}): ${detail.slice(0, 300)}`)
    }
  }

  async revoke(refreshToken: string): Promise<void> {
    const response = await fetch(`${REVOKE_URL}?token=${encodeURIComponent(refreshToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    if (!response.ok && response.status !== 400) {
      throw new Error(`Google não revogou o token (${response.status}).`)
    }
  }
}
