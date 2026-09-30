// Mensagem padrão de boas-vindas com o acesso de um usuário recém-criado —
// pra quem criou copiar e mandar (WhatsApp, e-mail). O link de login vem do
// endereço em que o app está aberto: ainda não há domínio fixo, então
// acompanha o ambiente (localhost, preview, produção) sem configuração.

export interface WelcomeMessageInput {
  name: string | null
  email: string
  password: string
  organizationName: string | null
  /** Padrão: o endereço atual do navegador. */
  origin?: string
}

export function loginUrl(origin: string = window.location.origin): string {
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
