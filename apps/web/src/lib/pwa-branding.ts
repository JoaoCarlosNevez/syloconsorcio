// Marca do app instalado (PWA) seguindo a organização White Label: aponta o
// manifest, o ícone da tela de início do iPhone, o nome e a cor da barra pra
// versão da organização (gerada pela API em /pwa/*). Sem White Label, volta
// pros arquivos da SyloCRM em public/.
//
// O celular só lê isso na hora de instalar (iPhone) ou de tempos em tempos
// (Android) — por isso o app aplica logo depois do login.

import { API_URL } from './api-client'

export interface PwaBrandingInput {
  organizationId: string
  organizationName: string
  /** Só vem preenchido pra organização White Label. */
  organizationIconUrl: string | null
  organizationSecondaryColor: string | null
}

export interface PwaBranding {
  manifestHref: string
  appleTouchIconHref: string
  appTitle: string
  themeColor: string
}

const SYLO: Omit<PwaBranding, 'manifestHref'> = {
  appleTouchIconHref: '/apple-touch-icon.png',
  appTitle: 'SyloCRM',
  themeColor: '#ffffff',
}

export function pwaBrandingFor(
  membership: PwaBrandingInput | null,
  appOrigin: string,
  apiUrl: string = API_URL,
): PwaBranding {
  if (!membership?.organizationIconUrl) return { ...SYLO, manifestHref: '/manifest.webmanifest' }
  const org = encodeURIComponent(membership.organizationId)
  return {
    manifestHref: `${apiUrl}/pwa/manifest?org=${org}&origin=${encodeURIComponent(appOrigin)}`,
    appleTouchIconHref: `${apiUrl}/pwa/icon/${org}/180.png`,
    appTitle: membership.organizationName,
    themeColor: membership.organizationSecondaryColor ?? SYLO.themeColor,
  }
}

function upsert<T extends HTMLElement>(doc: Document, selector: string, create: () => T): T {
  const existing = doc.head.querySelector<T>(selector)
  if (existing) return existing
  const element = create()
  doc.head.appendChild(element)
  return element
}

function setLink(doc: Document, rel: string, href: string): void {
  const link = upsert(doc, `link[rel="${rel}"]`, () => {
    const element = doc.createElement('link')
    element.rel = rel
    return element
  })
  if (link.getAttribute('href') !== href) link.setAttribute('href', href)
}

function setMeta(doc: Document, name: string, content: string): void {
  const meta = upsert(doc, `meta[name="${name}"]`, () => {
    const element = doc.createElement('meta')
    element.name = name
    return element
  })
  meta.content = content
}

export function applyPwaBranding(branding: PwaBranding, doc: Document = document): void {
  setLink(doc, 'manifest', branding.manifestHref)
  setLink(doc, 'apple-touch-icon', branding.appleTouchIconHref)
  setMeta(doc, 'apple-mobile-web-app-title', branding.appTitle)
  setMeta(doc, 'theme-color', branding.themeColor)
}
