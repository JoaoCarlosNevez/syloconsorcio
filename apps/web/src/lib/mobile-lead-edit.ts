// Validação da edição do lead no celular — mesmas regras do "Editar
// Atributos" do web (buildAttrsPayload no LeadModal): nome, segmento, crédito
// e telefone com DDD são obrigatórios; o resto vira null quando vazio.

import { parseValueToCents } from './lead-adapters'
import type { UpdateLeadPayload } from './leads-api'

export interface LeadEditForm {
  name: string
  phone: string
  email: string
  segment: string
  value: string
  quotaCount: string
  profession: string
  income: string
  maritalStatus: string
  cpf: string
}

export type LeadEditResult = { ok: true; payload: UpdateLeadPayload } | { ok: false; error: string }

export function leadEditPayload(form: LeadEditForm): LeadEditResult {
  if (!form.name.trim()) return { ok: false, error: 'Informe o nome.' }
  if (form.phone.replace(/\D/g, '').length < 10) {
    return { ok: false, error: 'Informe um telefone com DDD.' }
  }
  if (!form.segment.trim()) return { ok: false, error: 'Escolha o segmento.' }
  const valueCents = parseValueToCents(form.value)
  if (valueCents === null) return { ok: false, error: 'Informe o valor do crédito.' }
  const incomeCents = form.income.trim() ? parseValueToCents(form.income) : null
  const cpfDigits = form.cpf.replace(/\D/g, '')
  if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
    return { ok: false, error: 'O CPF precisa ter 11 dígitos.' }
  }
  return {
    ok: true,
    payload: {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      segment: form.segment,
      valueCents,
      quotaCount: Math.max(1, Number.parseInt(form.quotaCount, 10) || 1),
      profession: form.profession.trim() || null,
      incomeCents,
      maritalStatus: form.maritalStatus || null,
      cpf: form.cpf.trim() || null,
    },
  }
}
