import { describe, expect, it } from 'vitest'
import { DEFAULT_DOCUMENT_TITLE, DEFAULT_FAVICON, documentBrandingFor } from './document-branding'

describe('documentBrandingFor', () => {
  it('uses the White Label organization name and icon', () => {
    expect(
      documentBrandingFor({
        organizationName: 'Porthis Consórcios',
        organizationIconUrl: 'https://cdn.example/icon.png?v=1',
      }),
    ).toEqual({ title: 'Porthis Consórcios', iconUrl: 'https://cdn.example/icon.png?v=1' })
  })

  it('falls back to the SyloCRM brand', () => {
    const fallback = { title: DEFAULT_DOCUMENT_TITLE, iconUrl: DEFAULT_FAVICON }
    expect(documentBrandingFor({ organizationName: 'Sylo', organizationIconUrl: null })).toEqual(
      fallback,
    )
    expect(documentBrandingFor(null)).toEqual(fallback)
  })
})
