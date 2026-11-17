// Monta o e-mail da ficha de adesão pra administradora — sem servidor: abre o
// programa de e-mail do usuário (mailto:) com destinatário, assunto e a ficha
// no corpo. Os documentos a pessoa anexa na mão.
//
// Links mailto: muito longos são cortados por alguns programas (Outlook ~2 mil
// caracteres). Ficha grande vai com um corpo curto pedindo pra colar — a ficha
// inteira fica copiada na área de transferência.

/** Acima disso o corpo do mailto: vira só o aviso pra colar a ficha. */
export const MAILTO_MAX_LENGTH = 1800

export interface AdhesionEmail {
  href: string
  /** true = o corpo não coube; a pessoa cola a ficha (já copiada). */
  bodyTruncated: boolean
}

export function buildAdhesionEmail(input: {
  emails: readonly string[]
  clientName: string
  organizationName: string
  fichaText: string
}): AdhesionEmail {
  const to = input.emails.map(encodeURIComponent).join(',')
  const subject = `Ficha de adesão — ${input.clientName} (${input.organizationName})`
  const fullBody = `Olá,\n\nSegue a ficha de adesão de ${input.clientName}. Os documentos vão em anexo.\n\n${input.fichaText}`
  const shortBody = `Olá,\n\nSegue a ficha de adesão de ${input.clientName}. Os documentos vão em anexo.\n\n[cole a ficha aqui]`
  const build = (body: string) =>
    `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  const full = build(fullBody)
  if (full.length <= MAILTO_MAX_LENGTH) return { href: full, bodyTruncated: false }
  return { href: build(shortBody), bodyTruncated: true }
}
