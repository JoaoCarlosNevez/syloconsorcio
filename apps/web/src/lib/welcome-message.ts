// Mensagem padrão de boas-vindas com o acesso de um usuário recém-criado —
// pra quem criou copiar e mandar (WhatsApp, e-mail). O link de login aponta
// sempre pro app de produção, mesmo quando o acesso é criado pelo dev, por um
// preview ou pelo localhost — quem recebe a mensagem deve entrar no app real.
// VITE_APP_URL sobrescreve o endereço, se um dia o domínio mudar.

const DEFAULT_APP_URL = 'https://app.sylocrm.com.br'

function appUrl(): string {
  const fromEnv = import.meta.env.VITE_APP_URL?.trim()
  return (fromEnv || DEFAULT_APP_URL).replace(/\/+$/, '')
}

export interface WelcomeMessageInput {
  name: string | null
  email: string
  password: string
  organizationName: string | null
  /** Padrão: o app de produção (VITE_APP_URL ou app.sylocrm.com.br). */
  origin?: string
}

export function loginUrl(origin: string = appUrl()): string {
  return `${origin}/login`
}

export function buildWelcomeMessage(input: WelcomeMessageInput): string {
  const greeting = input.name?.trim() ? `Olá, ${input.name.trim()}!` : 'Olá!'
  const team = input.organizationName ? ` da equipe ${input.organizationName}` : ''
  return [
    greeting,
    '',
    `Seu acesso ao SyloCRM${team} está pronto.`,
    '',
    `Acesse: ${loginUrl(input.origin)}`,
    `E-mail: ${input.email}`,
    `Senha temporária: ${input.password}`,
    '',
    'No primeiro acesso, troque a senha em Configurações → Segurança.',
  ].join('\n')
}

/** Rótulo do botão de copiar: "Copiado!" logo após copiar, ou o aviso de
 * falha — ver useCopyToClipboard. */
export function copyLabel(
  key: string,
  idle: string,
  copiedKey: string | null,
  failedKey: string | null,
): string {
  if (copiedKey === key) return 'Copiado!'
  if (failedKey === key) return 'Não foi possível copiar'
  return idle
}
