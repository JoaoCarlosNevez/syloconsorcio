// Checklist de adesão — o que o vendedor precisa ter em mãos pra fazer a
// adesão na administradora. Lógica pura (sem React): os campos, quais são
// obrigatórios, o progresso e o texto pra colar no portal da administradora.

import type { CardData } from '../data/kanban-mock'
import { centsToMoneyInput, formatBRL, parseValueToCents } from './lead-adapters'
import type {
  AdhesionDocumentKind,
  LeadAdhesion,
  LeadAdhesionFields,
  LeadProposal,
  UpdateLeadPayload,
} from './leads-api'

/** Valores do formulário, como o usuário digita (dinheiro com máscara). */
export interface AdhesionForm {
  administrator: string
  sellerUserId: string
  assetValue: string
  assetCode: string
  planTable: string
  assetType: string
  groupCode: string
  quotaNumber: string
  downPayment: string
  prepaidInstallments: string
  paymentMethod: string
  installmentDueDay: string
  name: string
  profession: string
  income: string
  email: string
  birthplace: string
  maritalStatus: string
  spouseName: string
  phone: string
  phone2: string
  address: string
  zipCode: string
  preferredAdministrator: string
  contactHours: string
  notes: string
}

export type AdhesionSection = 'venda' | 'plano' | 'pessoais' | 'preferencias'

export interface AdhesionItem {
  key: keyof AdhesionForm
  label: string
  section: AdhesionSection
  /** Conta no progresso. Cônjuge só quando casado/união estável. */
  required: (form: AdhesionForm) => boolean
}

const always = () => true
const never = () => false

/** Cônjuge entra no checklist pra casado(a) e união estável. */
export function needsSpouse(maritalStatus: string): boolean {
  return /casad|uni[aã]o/i.test(maritalStatus)
}

export const ADHESION_ITEMS: AdhesionItem[] = [
  {
    key: 'administrator',
    label: 'Administradora / intermediação',
    section: 'venda',
    required: always,
  },
  { key: 'sellerUserId', label: 'Vendedor', section: 'venda', required: always },
  { key: 'assetValue', label: 'Valor do bem', section: 'plano', required: always },
  { key: 'assetCode', label: 'Código do bem', section: 'plano', required: never },
  { key: 'planTable', label: 'Tabela / plano', section: 'plano', required: always },
  { key: 'assetType', label: 'Tipo do bem', section: 'plano', required: always },
  { key: 'groupCode', label: 'Grupo', section: 'plano', required: never },
  { key: 'quotaNumber', label: 'Número da cota', section: 'plano', required: never },
  { key: 'downPayment', label: 'Entrada', section: 'plano', required: never },
  { key: 'prepaidInstallments', label: 'Parcelas antecipadas', section: 'plano', required: never },
  { key: 'paymentMethod', label: 'Forma de pagamento', section: 'plano', required: always },
  {
    key: 'installmentDueDay',
    label: 'Dia do vencimento do boleto',
    section: 'plano',
    required: never,
  },
  { key: 'name', label: 'Nome', section: 'pessoais', required: always },
  { key: 'profession', label: 'Profissão', section: 'pessoais', required: always },
  { key: 'income', label: 'Renda', section: 'pessoais', required: always },
  { key: 'email', label: 'E-mail', section: 'pessoais', required: always },
  { key: 'birthplace', label: 'Naturalidade', section: 'pessoais', required: always },
  { key: 'maritalStatus', label: 'Estado civil', section: 'pessoais', required: always },
  {
    key: 'spouseName',
    label: 'Cônjuge',
    section: 'pessoais',
    required: (form) => needsSpouse(form.maritalStatus),
  },
  { key: 'phone', label: 'Telefone', section: 'pessoais', required: always },
  { key: 'phone2', label: 'Telefone 2', section: 'pessoais', required: never },
  { key: 'address', label: 'Endereço', section: 'pessoais', required: always },
  { key: 'zipCode', label: 'CEP atualizado', section: 'pessoais', required: always },
  {
    key: 'preferredAdministrator',
    label: 'Preferência de administradora',
    section: 'preferencias',
    required: never,
  },
  {
    key: 'contactHours',
    label: 'Horários disponíveis para contato',
    section: 'preferencias',
    required: never,
  },
  { key: 'notes', label: 'Observação', section: 'preferencias', required: never },
]

export const PAYMENT_METHOD_OPTIONS = [
  'Boleto',
  'Débito em conta',
  'Cartão de crédito',
  'PIX',
] as const

/** Anexos da ficha — um arquivo por tipo. */
export const ADHESION_DOCUMENTS: {
  kind: AdhesionDocumentKind
  label: string
  hint: string
  required: boolean
}[] = [
  {
    kind: 'identity_document',
    label: 'Documento de identificação com foto',
    hint: 'RG, CNH ou outro documento oficial com foto (frente e verso)',
    required: true,
  },
  {
    kind: 'email_print',
    label: 'Print do e-mail',
    hint: 'Print da caixa de entrada do e-mail do cliente',
    required: true,
  },
  {
    kind: 'proof_of_address',
    label: 'Comprovante de residência',
    hint: 'Conta de luz, água, internet… recente',
    required: true,
  },
  {
    kind: 'handwritten_letter',
    label: 'Carta a punho',
    hint: 'Quando a administradora pedir',
    required: false,
  },
]

export function isFilled(form: AdhesionForm, key: keyof AdhesionForm): boolean {
  return form[key].trim() !== ''
}

export interface AdhesionProgress {
  done: number
  total: number
  /** Rótulos dos obrigatórios que faltam, na ordem do checklist. */
  missing: string[]
}

/** Progresso dos campos obrigatórios + anexos obrigatórios já enviados. */
export function adhesionProgress(
  form: AdhesionForm,
  uploadedKinds: ReadonlySet<AdhesionDocumentKind> = new Set(),
): AdhesionProgress {
  const required = ADHESION_ITEMS.filter((item) => item.required(form))
  const requiredDocuments = ADHESION_DOCUMENTS.filter((doc) => doc.required)
  const missing = [
    ...required.filter((item) => !isFilled(form, item.key)).map((item) => item.label),
    ...requiredDocuments.filter((doc) => !uploadedKinds.has(doc.kind)).map((doc) => doc.label),
  ]
  const total = required.length + requiredDocuments.length
  return { done: total - missing.length, total, missing }
}

function moneyOrEmpty(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? '' : centsToMoneyInput(cents)
}

/** Monta o formulário: a ficha salva, ou sugestões do lead e da última
 * proposta quando ainda não existe ficha. */
export function buildAdhesionForm(
  card: CardData,
  adhesion: LeadAdhesion | null,
  latestProposal: LeadProposal | null,
): AdhesionForm {
  return {
    administrator: adhesion?.administrator ?? '',
    sellerUserId: adhesion ? (adhesion.sellerUserId ?? '') : (card.assignedUserId ?? ''),
    assetValue: moneyOrEmpty(adhesion ? adhesion.assetValueCents : card.valueCents || null),
    assetCode: adhesion?.assetCode ?? '',
    planTable: adhesion ? (adhesion.planTable ?? '') : (latestProposal?.tableName ?? ''),
    assetType: adhesion ? (adhesion.assetType ?? '') : card.segment,
    groupCode: adhesion?.groupCode ?? '',
    quotaNumber: adhesion?.quotaNumber ?? '',
    downPayment: moneyOrEmpty(
      adhesion ? adhesion.downPaymentCents : (latestProposal?.downPaymentCents ?? null),
    ),
    prepaidInstallments:
      adhesion?.prepaidInstallments !== null && adhesion?.prepaidInstallments !== undefined
        ? String(adhesion.prepaidInstallments)
        : '',
    paymentMethod: adhesion?.paymentMethod ?? '',
    installmentDueDay:
      adhesion?.installmentDueDay !== null && adhesion?.installmentDueDay !== undefined
        ? String(adhesion.installmentDueDay)
        : '',
    name: card.name,
    profession: card.profession ?? '',
    income: moneyOrEmpty(card.incomeCents),
    email: card.email ?? '',
    birthplace: adhesion?.birthplace ?? '',
    maritalStatus: card.maritalStatus ?? '',
    spouseName: adhesion?.spouseName ?? '',
    phone: card.phone,
    phone2: adhesion?.phone2 ?? '',
    address: adhesion?.address ?? '',
    zipCode: adhesion?.zipCode ?? '',
    preferredAdministrator: adhesion?.preferredAdministrator ?? '',
    contactHours: adhesion?.contactHours ?? '',
    notes: adhesion?.notes ?? '',
  }
}

const textOrNull = (value: string) => value.trim() || null

/** "10" → 10; vazio ou fora de 1–31 → null. */
function dueDayOrNull(value: string): number | null {
  const day = Number.parseInt(value, 10)
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null
}

/** Campos da ficha (o que não é do lead) pra API. */
export function adhesionFields(form: AdhesionForm): LeadAdhesionFields {
  const prepaid = Number.parseInt(form.prepaidInstallments, 10)
  return {
    administrator: textOrNull(form.administrator),
    sellerUserId: textOrNull(form.sellerUserId),
    assetValueCents: form.assetValue.trim() ? parseValueToCents(form.assetValue) : null,
    assetCode: textOrNull(form.assetCode),
    planTable: textOrNull(form.planTable),
    assetType: textOrNull(form.assetType),
    groupCode: textOrNull(form.groupCode),
    quotaNumber: textOrNull(form.quotaNumber),
    downPaymentCents: form.downPayment.trim() ? parseValueToCents(form.downPayment) : null,
    prepaidInstallments: Number.isNaN(prepaid) ? null : prepaid,
    paymentMethod: textOrNull(form.paymentMethod),
    installmentDueDay: dueDayOrNull(form.installmentDueDay),
    birthplace: textOrNull(form.birthplace),
    spouseName: needsSpouse(form.maritalStatus) ? textOrNull(form.spouseName) : null,
    phone2: textOrNull(form.phone2),
    address: textOrNull(form.address),
    zipCode: textOrNull(form.zipCode),
    preferredAdministrator: textOrNull(form.preferredAdministrator),
    contactHours: textOrNull(form.contactHours),
    notes: textOrNull(form.notes),
  }
}

/** Dados pessoais que moram no lead — só os que mudaram. */
export function leadChanges(form: AdhesionForm, card: CardData): UpdateLeadPayload {
  const changes: UpdateLeadPayload = {}
  if (form.name.trim() && form.name.trim() !== card.name) changes.name = form.name.trim()
  if (form.phone.trim() && form.phone.trim() !== card.phone) changes.phone = form.phone.trim()
  const email = textOrNull(form.email)
  if (email !== (card.email ?? null)) changes.email = email
  const profession = textOrNull(form.profession)
  if (profession !== (card.profession ?? null)) changes.profession = profession
  const incomeCents = form.income.trim() ? parseValueToCents(form.income) : null
  if (incomeCents !== (card.incomeCents ?? null)) changes.incomeCents = incomeCents
  const maritalStatus = textOrNull(form.maritalStatus)
  if (maritalStatus !== (card.maritalStatus ?? null)) changes.maritalStatus = maritalStatus
  return changes
}

/** "74000-000" — só dígitos, com o hífen. */
export function formatZipCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

const SECTION_TITLE: Record<AdhesionSection, string> = {
  venda: 'VENDA',
  plano: 'DADOS DO PLANO',
  pessoais: 'DADOS PESSOAIS',
  preferencias: 'PREFERÊNCIAS',
}

/** Ficha em texto, pra colar no portal da administradora ou mandar no chat. */
export function adhesionText(
  form: AdhesionForm,
  context: { organizationName: string; sellerName: string | null },
): string {
  const value = (item: AdhesionItem): string => {
    if (item.key === 'sellerUserId') return context.sellerName ?? ''
    if (item.key === 'assetValue' || item.key === 'downPayment' || item.key === 'income') {
      const cents = parseValueToCents(form[item.key])
      return cents === null ? '' : `R$ ${formatBRL(cents)}`
    }
    return form[item.key].trim()
  }
  const lines: string[] = [`FICHA DE ADESÃO — ${form.name.trim()}`, '']
  for (const section of Object.keys(SECTION_TITLE) as AdhesionSection[]) {
    lines.push(SECTION_TITLE[section])
    if (section === 'venda') lines.push(`Representação: ${context.organizationName}`)
    for (const item of ADHESION_ITEMS.filter((i) => i.section === section)) {
      if (item.key === 'spouseName' && !needsSpouse(form.maritalStatus)) continue
      lines.push(`${item.label}: ${value(item) || '—'}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}
