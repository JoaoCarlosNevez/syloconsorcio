import { describe, expect, it } from 'vitest'
import { buildPwaManifest, shortName } from './pwa-manifest'

const BASE = {
  appOrigin: 'https://dev.sylocrm.com.br',
  apiBaseUrl: 'https://api-dev.sylocrm.com.br',
}

describe('buildPwaManifest', () => {
  it('uses the White Label name, generated icons and secondary color', () => {
    const manifest = buildPwaManifest({
      ...BASE,
      organization: {
        id: 'org-1',
        name: 'Porthis Consórcios',
        isWhiteLabel: true,
        branding: { iconUrl: 'https://cdn/icon.webp', secondaryColor: '#123456' },
      },
    })
    expect(manifest).toMatchObject({
      name: 'Porthis Consórcios',
      short_name: 'Porthis',
      id: 'https://dev.sylocrm.com.br/m',
      start_url: 'https://dev.sylocrm.com.br/m',
      theme_color: '#123456',
      icons: [
        { src: 'https://api-dev.sylocrm.com.br/pwa/icon/org-1/192.png', sizes: '192x192' },
        { src: 'https://api-dev.sylocrm.com.br/pwa/icon/org-1/512.png', sizes: '512x512' },
      ],
    })
  })

  it('falls back to SyloCRM without White Label or without an icon', () => {
    for (const organization of [
      null,
      { id: 'o', name: 'Sem WL', isWhiteLabel: false, branding: { iconUrl: 'x' } },
      { id: 'o', name: 'WL sem ícone', isWhiteLabel: true, branding: null },
    ]) {
      const manifest = buildPwaManifest({ ...BASE, organization })
      expect(manifest.name).toBe('SyloCRM')
      expect(manifest.icons).toEqual([
        expect.objectContaining({ src: 'https://dev.sylocrm.com.br/pwa-icon-192.png' }),
        expect.objectContaining({ src: 'https://dev.sylocrm.com.br/pwa-icon-512.png' }),
      ])
    }
  })
})

describe('shortName', () => {
  it('keeps short names and cuts long ones at the first word', () => {
    expect(shortName('PHS')).toBe('PHS')
    expect(shortName('Realize Consórcios')).toBe('Realize')
    expect(shortName('Supercalifragilistico Ltda')).toBe('Supercalifra')
  })
})
