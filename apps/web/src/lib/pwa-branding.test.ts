import { describe, expect, it } from 'vitest'
import { applyPwaBranding, pwaBrandingFor } from './pwa-branding'

const ORIGIN = 'https://dev.sylocrm.com.br'
const API = 'https://api-dev.sylocrm.com.br'

describe('pwaBrandingFor', () => {
  it('points to the API-generated manifest and icon for a White Label org', () => {
    expect(
      pwaBrandingFor(
        {
          organizationId: 'org-1',
          organizationName: 'Porthis',
          organizationIconUrl: 'https://cdn/icon.webp',
          organizationSecondaryColor: '#123456',
        },
        ORIGIN,
        API,
      ),
    ).toEqual({
      manifestHref: `${API}/pwa/manifest?org=org-1&origin=${encodeURIComponent(ORIGIN)}`,
      appleTouchIconHref: `${API}/pwa/icon/org-1/180.png`,
      appTitle: 'Porthis',
      themeColor: '#123456',
    })
  })

  it('keeps the SyloCRM files without White Label', () => {
    expect(
      pwaBrandingFor(
        {
          organizationId: 'org-1',
          organizationName: 'Sylo',
          organizationIconUrl: null,
          organizationSecondaryColor: null,
        },
        ORIGIN,
        API,
      ),
    ).toEqual({
      manifestHref: '/manifest.webmanifest',
      appleTouchIconHref: '/apple-touch-icon.png',
      appTitle: 'SyloCRM',
      themeColor: '#ffffff',
    })
  })
})

describe('applyPwaBranding', () => {
  it('updates the head tags in place', () => {
    applyPwaBranding({
      manifestHref: '/a.webmanifest',
      appleTouchIconHref: '/a.png',
      appTitle: 'A',
      themeColor: '#000000',
    })
    applyPwaBranding({
      manifestHref: '/b.webmanifest',
      appleTouchIconHref: '/b.png',
      appTitle: 'B',
      themeColor: '#111111',
    })
    expect(document.head.querySelectorAll('link[rel="manifest"]')).toHaveLength(1)
    expect(document.head.querySelector('link[rel="manifest"]')?.getAttribute('href')).toBe(
      '/b.webmanifest',
    )
    expect(
      document.head.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]')
        ?.content,
    ).toBe('B')
  })
})
