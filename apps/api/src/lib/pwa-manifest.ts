// Manifest do app do celular (PWA) por organização — o que o celular usa pra
// nome, ícone e cor do app instalado. Organização White Label com ícone
// ganha o próprio nome, ícone e cor; as demais, a marca SyloCRM.
//
// O id continua "/m" pra qualquer organização: é o mesmo app instalado, só
// com outra cara — trocar o id faria o celular tratar como outro app.

import type { OrganizationRecord } from '@sylocrm/application'

export const PWA_ICON_SIZES = [180, 192, 512] as const
export type PwaIconSize = (typeof PWA_ICON_SIZES)[number]

const SYLO = {
  name: 'SyloCRM',
  description: 'O SyloCRM no celular do vendedor: fila de leads, tarefas e avisos.',
  themeColor: '#ffffff',
}

/** White Label com ícone — só aí o app troca de marca. */
export function hasPwaBranding(
  organization: Pick<OrganizationRecord, 'isWhiteLabel' | 'branding'>,
): boolean {
  return organization.isWhiteLabel && Boolean(organization.branding?.iconUrl)
}

/** Nome curto (embaixo do ícone): até 12 caracteres, cortando em palavra. */
export function shortName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length <= 12) return trimmed
  const firstWord = trimmed.split(/\s+/)[0] ?? trimmed
  return firstWord.length <= 12 ? firstWord : trimmed.slice(0, 12)
}

export interface PwaManifestInput {
  /** Endereço do app (ex: https://dev.sylocrm.com.br) — já validado. */
  appOrigin: string
  /** Base pública desta API, pra apontar os ícones gerados. */
  apiBaseUrl: string
  organization: Pick<OrganizationRecord, 'id' | 'name' | 'isWhiteLabel' | 'branding'> | null
}

export function buildPwaManifest(input: PwaManifestInput): Record<string, unknown> {
  const org = input.organization
  const branded = org && hasPwaBranding(org) ? org : null
  const name = branded ? branded.name : SYLO.name
  const icons = branded
    ? PWA_ICON_SIZES.filter((size) => size !== 180).map((size) => ({
        src: `${input.apiBaseUrl}/pwa/icon/${branded.id}/${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose: 'any',
      }))
    : [
        {
          src: `${input.appOrigin}/pwa-icon-192.png`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: `${input.appOrigin}/pwa-icon-512.png`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
      ]
  const themeColor = branded?.branding?.secondaryColor ?? SYLO.themeColor
  return {
    name,
    short_name: shortName(name),
    description: SYLO.description,
    lang: 'pt-BR',
    id: `${input.appOrigin}/m`,
    start_url: `${input.appOrigin}/m`,
    scope: `${input.appOrigin}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8fafc',
    theme_color: themeColor,
    icons,
  }
}
