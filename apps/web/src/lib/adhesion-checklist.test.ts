import { describe, expect, it } from 'vitest'
import type { CardData } from '../data/kanban-mock'
import {
  type AdhesionForm,
  type QuotaForm,
  adhesionFields,
  adhesionProgress,
  adhesionText,
  buildAdhesionForm,
  emptyQuota,
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
  quotaCount: 1,
  assignedUserId: 'ana',
  profession: 'Enfermeira',
  incomeCents: 8_000_00,
  maritalStatus: 'Solteiro(a)',
} as CardData

const ALL_DOCS = new Set([
  'identity_document',
  'email_print',
  'proof_of_address',
  'handwritten_letter',
] as const)

function filledQuota(overrides: Partial<QuotaForm> = {}): QuotaForm {
  return {
    ...emptyQuota(),
    administrator: 'Porto Seguro',
    assetValue: '350.000,00',
    planTable: 'Imóvel 200',
    assetType: 'Imóvel',
    paymentMethod: 'Boleto',
    ...overrides,
  }
}

function filledForm(overrides: Partial<AdhesionForm> = {}): AdhesionForm {
  return {
    ...buildAdhesionForm(CARD, null, null),
    email: 'maria@email.com',
    birthplace: 'Goiânia/GO',
    address: 'Rua A, 10 — Centro, Goiânia/GO',
    zipCode: '74000-000',
    quotas: [filledQuota()],
    ...overrides,
  }
}

describe('needsSpouse', () => {
  it('asks for the spouse only when married or in a stable union', () => {
    expect(needsSpouse('Casado(a)')).toBe(true)
    expect(needsSpouse('União Estável')).toBe(true)
    expect(needsSpouse('Solteiro(a)')).toBe(false)
    expect(needsSpouse('')).toBe(false)
  })
})

describe('buildAdhesionForm', () => {
  it('suggests seller and one quota from the lead and the latest proposal', () => {
    const form = buildAdhesionForm(CARD, null, {
      tableName: 'Imóvel 200',
      downPaymentCents: 20_000_00,
    } as never)

    expect(form).toMatchObject({
      sellerUserId: 'ana',
      name: 'Maria Souza',
      profession: 'Enfermeira',
    })
    expect(form.quotas).toEqual([
      expect.objectContaining({
        assetValue: '350.000,00',
        assetType: 'Imóvel',
        planTable: 'Imóvel 200',
        downPayment: '20.000,00',
      }),
    ])
  })
})

describe('adhesionProgress', () => {
  it('counts the required items and lists the missing ones', () => {
    const progress = adhesionProgress(buildAdhesionForm(CARD, null, null))

    // 10 da venda/pessoais + 5 da cota + 3 documentos.
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

  it('requires the plan fields of every quota, naming the quota', () => {
    const progress = adhesionProgress(
      filledForm({ quotas: [filledQuota(), filledQuota({ planTable: '', groupCode: '5678' })] }),
      ALL_DOCS,
    )

    expect(progress.total).toBe(23)
    expect(progress.missing).toEqual(['Cota 2: Tabela / plano'])
  })

  it('requires the spouse for married clients', () => {
    const progress = adhesionProgress(filledForm({ maritalStatus: 'Casado(a)' }), ALL_DOCS)

    expect(progress.missing).toEqual(['Cônjuge'])
  })

  it('is complete when every required item is filled', () => {
    expect(adhesionProgress(filledForm(), ALL_DOCS)).toMatchObject({
      done: 18,
      total: 18,
      missing: [],
    })
  })
})

describe('adhesionFields / leadChanges', () => {
  it('converts each quota: money to cents, empty texts to null', () => {
    const fields = adhesionFields(
      filledForm({
        spouseName: 'João',
        quotas: [
          filledQuota({ prepaidInstallments: '3', installmentDueDay: '10' }),
          filledQuota({ assetValue: '150.000,00', groupCode: '5678', quotaNumber: '0123' }),
        ],
      }),
    )

    expect(fields.spouseName).toBeNull() // solteira
    expect(fields.quotas).toEqual([
      expect.objectContaining({
        assetValueCents: 350_000_00,
        assetCode: null,
        prepaidInstallments: 3,
        installmentDueDay: 10,
      }),
      expect.objectContaining({
        assetValueCents: 150_000_00,
        groupCode: '5678',
        quotaNumber: '0123',
      }),
    ])
  })

  it('updates the lead value with the sum of the quotas and the quota count', () => {
    const changes = leadChanges(
      filledForm({
        quotas: [
          filledQuota({ assetValue: '200.000,00' }),
          filledQuota({ assetValue: '150.000,00' }),
        ],
      }),
      CARD,
    )

    // 200 + 150 mil = o valor que o lead já tinha → não muda; a quantidade muda.
    expect(changes.valueCents).toBeUndefined()
    expect(changes.quotaCount).toBe(2)

    const bigger = leadChanges(
      filledForm({
        quotas: [
          filledQuota({ assetValue: '300.000,00' }),
          filledQuota({ assetValue: '150.000,00' }),
        ],
      }),
      CARD,
    )
    expect(bigger.valueCents).toBe(450_000_00)
  })

  it('changes the value only when every quota has one', () => {
    const changes = leadChanges(
      filledForm({
        quotas: [filledQuota({ assetValue: '500.000,00' }), filledQuota({ assetValue: '' })],
      }),
      CARD,
    )

    expect(changes.valueCents).toBeUndefined()
    expect(changes.quotaCount).toBe(2)
  })
})

describe('formatZipCode', () => {
  it('keeps only digits with the hyphen', () => {
    expect(formatZipCode('74000000')).toBe('74000-000')
    expect(formatZipCode('740')).toBe('740')
  })
})

describe('adhesionText', () => {
  it('lists every quota in its own block', () => {
    const text = adhesionText(
      filledForm({
        quotas: [filledQuota({ groupCode: '1234' }), filledQuota({ groupCode: '5678' })],
      }),
      { organizationName: 'Sylo', sellerName: 'Ana' },
    )

    expect(text).toContain('COTA 1 DE 2')
    expect(text).toContain('COTA 2 DE 2')
    expect(text).toContain('Grupo: 5678')
    expect(text).toContain('Representação: Sylo')
    expect(text).toContain('Vendedor: Ana')
  })
})
