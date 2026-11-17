// Ports do envio pelo Gmail do usuário (login com Google, escopo gmail.send).
//
// Implementações concretas: packages/infrastructure/src/google/ (OAuth + API
// do Gmail) e packages/infrastructure/src/database/repositories/ (conta).

/** Conta Google conectada — o token fica só dentro da infraestrutura. */
export interface GoogleAccountRecord {
  userId: string
  googleEmail: string
  connectedAt: Date
}

export interface IGoogleAccountRepository {
  find(userId: string): Promise<GoogleAccountRecord | null>
  /** Refresh token em claro — só pra quem vai chamar o Google. */
  findRefreshToken(userId: string): Promise<string | null>
  /** Cria ou substitui a conexão (reconectar troca o token). */
  save(input: {
    userId: string
    googleEmail: string
    refreshToken: string
    scopes: string
  }): Promise<void>
  remove(userId: string): Promise<void>
}

export interface MailAttachment {
  filename: string
  contentType: string
  data: Buffer
}

export interface OutgoingMail {
  to: string[]
  subject: string
  text: string
  attachments: MailAttachment[]
}

/** O Google não aceita mais o token (revogado, senha trocada, 7 dias no modo
 * de teste): a pessoa precisa conectar de novo. */
export class GmailNotConnectedError extends Error {
  constructor(message = 'Conecte sua conta Google de novo pra enviar pelo Gmail.') {
    super(message)
    this.name = 'GmailNotConnectedError'
  }
}

export interface IGmailGateway {
  /** URL da tela de autorização do Google. */
  authorizationUrl(state: string): string
  /** Troca o código da volta do Google pelo token e o e-mail da conta.
   * Lança erro se o usuário não autorizou o envio (gmail.send). */
  exchangeCode(code: string): Promise<{ googleEmail: string; refreshToken: string; scopes: string }>
  /** Envia pela conta do usuário. GmailNotConnectedError se o token não vale. */
  send(refreshToken: string, mail: OutgoingMail): Promise<void>
  /** Revoga o token no Google (desconectar). Falha aqui não impede apagar. */
  revoke(refreshToken: string): Promise<void>
}

export interface OAuthStateClaims {
  userId: string
  /** Pra onde o navegador volta depois do Google (validado na rota). */
  returnTo: string
  expiresAt: Date
}

/** Assina o `state` do OAuth: liga a volta do Google ao usuário que começou o
 * fluxo, sem guardar nada no servidor. */
export interface IOAuthStateSigner {
  sign(claims: OAuthStateClaims): string
  /** null = inválido, adulterado ou vencido. */
  verify(state: string, now: Date): OAuthStateClaims | null
}
