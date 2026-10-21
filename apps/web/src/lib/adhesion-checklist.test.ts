import { describe, expect, it } from 'vitest'
import type { CardData } from '../data/kanban-mock'
import {
  type AdhesionForm,
  adhesionFields,
  adhesionProgress,
  adhesionText,
  buildAdhesionForm,
  formatZipCode,
  leadChanges,
  needsSpouse,
} from './adhesion-checklist'

const CARD = {
  id: 'lead-01',
  name: 'Maria Souza',
  phone: '(62) 99999-0000',
  email: null,
  segment: 'Imóvel',
  valueCents: 350_000_00,
  assignedUserId: 'ana',
  profession: 'Enfermeira',
  incomeCents: 8_000_00,
  maritalStatus: 'Solteiro(a)',
} as CardData

function filledForm(overrides: Partial<AdhesionForm> = {}): AdhesionForm {
  return {
    ...buildAdhesionForm(CARD, null, null),
    administrator: 'Porto Seguro',
    planTable: 'Imóvel 200',
    email: 'maria@email.com',
    birthplace: 'Goiânia/GO',
    address: 'Rua A, 10 — Centro, Goiânia/GO',
    zipCode: '74000-000',
    paymentMethod: 'Boleto',
    ...overrides,
  }
}

const ALL_DOCS = new Set([
  'identity_document',
  'email_print',
  'proof_of_address',
  'handwritten_letter',
] as const)

describe('needsSpouse', () => {
  it('asks for the spouse only when married or in a stable union', () => {
    expect(needsSpouse('Casado(a)')).toBe(true)
    expect(needsSpouse('União Estável')).toBe(true)
    expect(needsSpouse('Solteiro(a)')).toBe(false)
    expect(needsSpouse('')).toBe(false)
  })
})

describe('buildAdhesionForm', () => {
  it('suggests seller, asset value/type and the latest proposal when there is no adhesion yet', () => {
    const form = buildAdhesionForm(CARD, null, {
      tableName: 'Imóvel 200',
      downPaymentCents: 20_000_00,
    } as never)

    expect(form).toMatchObject({
      sellerUserId: 'ana',
      assetValue: '350.000,00',
      assetType: 'Imóvel',
      planTable: 'Imóvel 200',
      downPayment: '20.000,00',
      name: 'Maria Souza',
      profession: 'Enfermeira',
    })
  })
})

describe('adhesionProgress', () => {
  it('counts the required items and lists the missing ones', () => {
    const progress = adhesionProgress(buildAdhesionForm(CARD, null, null))

    expect(progress.total).toBe(18)
    expect(progress.missing).toEqual([
      'Administradora / intermediação',
      'Tabela / plano',
      'Forma de pagamento',
      'E-mail',
      'Naturalidade',
      'Endereço',
      'CEP atualizado',
      'Documento de identificação com foto',
      'Print do e-mail',
      'Comprovante de residência',
    ])
  })

  it('requires the spouse for married clients', () => {
    const progress = adhesionProgress(filledForm({ maritalStatus: 'Casado(a)' }), ALL_DOCS)

    expect(progress.total).toBe(19)
    expect(progress.missing).toEqual(['Cônjuge'])
  })

  it('is complete when every required item is filled', () => {
    expect(adhesionProgress(filledForm(), ALL_DOCS)).toMatchObject({
      done: 18,
      total: 18,
      missing: [],
    })
  })

  it('does not require the handwritten letter', () => {
    const progress = adhesionProgress(
      filledForm(),
      new Set(['identity_document', 'email_print', 'proof_of_address'] as const),
    )
    expect(progress.missing).toEqual([])
  })
})

describe('adhesionFields / leadChanges', () => {
  it('converts money to cents, empty texts to null and drops the spouse when single', () => {
    const fields = adhesionFields(filledForm({ spouseName: 'João', prepaidInstallments: '3' }))

    expect(fields).toMatchObject({
      assetValueCents: 350_000_00,
      prepaidInstallments: 3,
      spouseName: null,
      groupCode: null,
    })
  })

  it('only sends the lead fields that changed', () => {
    expect(leadChanges(filledForm(), CARD)).toEqual({ email: 'maria@email.com' })
  })
})

describe('formatZipCode / adhesionText', () => {
  it('masks the zip code', () => {
    expect(formatZipCode('74000000')).toBe('74000-000')
  })

  it('renders the adhesion as text to paste in the administrator portal', () => {
    const text = adhesionText(filledForm(), { organizationName: 'Sylo', sellerName: 'Ana' })

    expect(text).toContain('Representação: Sylo')
    expect(text).toContain('Vendedor: Ana')
    expect(text).toContain('Valor do bem: R$ 350.000')
    expect(text).not.toContain('Cônjuge')
  })
})
