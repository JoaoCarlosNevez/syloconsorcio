// Nome e ícone da aba do navegador seguindo a instância: organização White
// Label mostra o próprio nome e ícone; as demais, a marca SyloCRM.

export const DEFAULT_DOCUMENT_TITLE = 'SyloCRM'
export const DEFAULT_FAVICON = '/favicon.png'

export interface DocumentBranding {
  title: string
  iconUrl: string
}

/** organizationIconUrl só vem preenchido pra organização White Label. */
export function documentBrandingFor(
  membership: { organizationName: string; organizationIconUrl: string | null } | null,
): DocumentBranding {
  if (!membership?.organizationIconUrl) {
    return { title: DEFAULT_DOCUMENT_TITLE, iconUrl: DEFAULT_FAVICON }
  }
  return { title: membership.organizationName, iconUrl: membership.organizationIconUrl }
}

export function applyDocumentBranding(branding: DocumentBranding, doc: Document = document): void {
  doc.title = branding.title
  let link = doc.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = doc.createElement('link')
    link.rel = 'icon'
    doc.head.appendChild(link)
  }
  if (link.getAttribute('href') !== branding.iconUrl) {
    // O tipo do ícone da organização varia (PNG, SVG, WEBP) — deixa o
    // navegador descobrir.
    link.removeAttribute('type')
    link.href = branding.iconUrl
  }
}
