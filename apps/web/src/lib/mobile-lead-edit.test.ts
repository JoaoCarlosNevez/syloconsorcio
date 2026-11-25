import { describe, expect, it } from 'vitest'
import { type LeadEditForm, leadEditPayload } from './mobile-lead-edit'

const FORM: LeadEditForm = {
  name: ' Maria Souza ',
  phone: '(62) 99999-0000',
  email: '',
  segment: 'Imóvel',
  value: '350.000,00',
  quotaCount: '2',
  profession: '',
  income: '8.000,00',
  maritalStatus: '',
  cpf: '',
}

describe('leadEditPayload', () => {
  it('builds the PATCH payload, turning empty fields into null', () => {
    expect(leadEditPayload(FORM)).toEqual({
      ok: true,
      payload: {
        name: 'Maria Souza',
        phone: '(62) 99999-0000',
        email: null,
        segment: 'Imóvel',
        valueCents: 350_000_00,
        quotaCount: 2,
        profession: null,
        incomeCents: 8_000_00,
        maritalStatus: null,
        cpf: null,
      },
    })
  })

  it('keeps at least one quota', () => {
    const result = leadEditPayload({ ...FORM, quotaCount: '' })
    expect(result.ok && result.payload.quotaCount).toBe(1)
  })

  it('refuses a missing name, phone without area code, zero credit or a short CPF', () => {
    expect(leadEditPayload({ ...FORM, name: ' ' })).toEqual({ ok: false, error: 'Informe o nome.' })
    expect(leadEditPayload({ ...FORM, phone: '9999-0000' }).ok).toBe(false)
    expect(leadEditPayload({ ...FORM, value: '' }).ok).toBe(false)
    expect(leadEditPayload({ ...FORM, cpf: '123.456' }).ok).toBe(false)
    expect(leadEditPayload({ ...FORM, cpf: '123.456.789-09' }).ok).toBe(true)
  })
})
