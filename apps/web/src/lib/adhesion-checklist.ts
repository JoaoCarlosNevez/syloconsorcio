// Checklist de adesão — o que o vendedor precisa ter em mãos pra fazer a
// adesão na administradora. Lógica pura (sem React): os campos, quais são
// obrigatórios, o progresso e o texto pra colar no portal da administradora.
//
// Uma venda pode ter VÁRIAS cotas (ex: 2 grupos pra fechar o valor): os dados
// da venda e pessoais aparecem uma vez; os do plano, uma vez por cota. Ao
// marcar Ganho, cada cota vira um card no ADM.

import type { CardData } from '../data/kanban-mock'
import { centsToMoneyInput, formatBRL, parseValueToCents } from './lead-adapters'
import type {
  AdhesionDocumentKind,
  AdhesionQuotaFields,
  LeadAdhesion,
  LeadAdhesionFields,
  LeadProposal,
  UpdateLeadPayload,
} from './leads-api'

/** Dados do plano de uma cota, como o usuário digita (dinheiro com máscara). */
export interface QuotaForm {
  administrator: string
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
}

/** Valores do formulário, como o usuário digita. */
export interface AdhesionForm {
  sellerUserId: string
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
  quotas: QuotaForm[]
}

export type AdhesionFieldKey = Exclude<keyof AdhesionForm, 'quotas'>
export type AdhesionSection = 'venda' | 'pessoais' | 'preferencias'

export interface AdhesionItem {
  key: AdhesionFieldKey
  label: string
  section: AdhesionSection
  /** Conta no progresso. Cônjuge só quando casado/união estável. */
  required: (form: AdhesionForm) => boolean
}

export interface QuotaItem {
  key: keyof QuotaForm
  label: string
  required: boolean
}

const always = () => true
const never = () => false

/** Cônjuge entra no checklist pra casado(a) e união estável. */
export function needsSpouse(maritalStatus: string): boolean {
  return /casad|uni[aã]o/i.test(maritalStatus)
}

export const ADHESION_ITEMS: AdhesionItem[] = [
  { key: 'sellerUserId', label: 'Vendedor', section: 'venda', required: always },
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

/** Campos de cada cota (dados do plano). */
export const QUOTA_ITEMS: QuotaItem[] = [
  { key: 'administrator', label: 'Administradora / intermediação', required: true },
  { key: 'assetValue', label: 'Valor do bem', required: true },
  { key: 'assetCode', label: 'Código do bem', required: false },
  { key: 'planTable', label: 'Tabela / plano', required: true },
  { key: 'assetType', label: 'Tipo do bem', required: true },
  { key: 'groupCode', label: 'Grupo', required: false },
  { key: 'quotaNumber', label: 'Número da cota', required: false },
  { key: 'downPayment', label: 'Entrada', required: false },
  { key: 'prepaidInstallments', label: 'Parcelas antecipadas', required: false },
  { key: 'paymentMethod', label: 'Forma de pagamento', required: true },
  { key: 'installmentDueDay', label: 'Dia do vencimento do boleto', required: false },
]

export const MAX_QUOTAS = 10

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

export function isFilled(form: AdhesionForm, key: AdhesionFieldKey): boolean {
  return form[key].trim() !== ''
}

export function isQuotaFilled(quota: QuotaForm, key: keyof QuotaForm): boolean {
  return quota[key].trim() !== ''
}

export interface AdhesionProgress {
  done: number
  total: number
  /** Rótulos dos obrigatórios que faltam, na ordem do checklist. */
  missing: string[]
}

/** Progresso: campos obrigatórios + obrigatórios de cada cota + anexos. */
export function adhesionProgress(
  form: AdhesionForm,
  uploadedKinds: ReadonlySet<AdhesionDocumentKind> = new Set(),
): AdhesionProgress {
  const required = ADHESION_ITEMS.filter((item) => item.required(form))
  const requiredQuota = QUOTA_ITEMS.filter((item) => item.required)
  const requiredDocuments = ADHESION_DOCUMENTS.filter((doc) => doc.required)
  const several = form.quotas.length > 1
  const quotaMissing = form.quotas.flatMap((quota, index) =>
    requiredQuota
      .filter((item) => !isQuotaFilled(quota, item.key))
      .map((item) => (several ? `Cota ${index + 1}: ${item.label}` : item.label)),
  )
  const missing = [
    ...required
      .filter((item) => item.section === 'venda' && !isFilled(form, item.key))
      .map((item) => item.label),
    ...quotaMissing,
    ...required
      .filter((item) => item.section !== 'venda' && !isFilled(form, item.key))
      .map((item) => item.label),
    ...requiredDocuments.filter((doc) => !uploadedKinds.has(doc.kind)).map((doc) => doc.label),
  ]
  const total =
    required.length + requiredQuota.length * form.quotas.length + requiredDocuments.length
  return { done: total - missing.length, total, missing }
}

function moneyOrEmpty(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? '' : centsToMoneyInput(cents)
}

function numberOrEmpty(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

export function emptyQuota(): QuotaForm {
  return {
    administrator: '',
    assetValue: '',
    assetCode: '',
    planTable: '',
    assetType: '',
    groupCode: '',
    quotaNumber: '',
    downPayment: '',
    prepaidInstallments: '',
    paymentMethod: '',
    installmentDueDay: '',
  }
}

function quotaToForm(quota: AdhesionQuotaFields): QuotaForm {
  return {
    administrator: quota.administrator ?? '',
    assetValue: moneyOrEmpty(quota.assetValueCents),
    assetCode: quota.assetCode ?? '',
    planTable: quota.planTable ?? '',
    assetType: quota.assetType ?? '',
    groupCode: quota.groupCode ?? '',
    quotaNumber: quota.quotaNumber ?? '',
    downPayment: moneyOrEmpty(quota.downPaymentCents),
    prepaidInstallments: numberOrEmpty(quota.prepaidInstallments),
    paymentMethod: quota.paymentMethod ?? '',
    installmentDueDay: numberOrEmpty(quota.installmentDueDay),
  }
}

/** Monta o formulário: a ficha salva, ou sugestões do lead e da última
 * proposta quando ainda não existe ficha (uma cota). */
export function buildAdhesionForm(
  card: CardData,
  adhesion: LeadAdhesion | null,
  latestProposal: LeadProposal | null,
): AdhesionForm {
  const suggested: QuotaForm = {
    ...emptyQuota(),
    assetValue: moneyOrEmpty(card.valueCents || null),
    planTable: latestProposal?.tableName ?? '',
    assetType: card.segment,
    downPayment: moneyOrEmpty(latestProposal?.downPaymentCents ?? null),
  }
  const quotas =
    adhesion && adhesion.quotas.length > 0 ? adhesion.quotas.map(quotaToForm) : [suggested]
  return {
    sellerUserId: adhesion ? (adhesion.sellerUserId ?? '') : (card.assignedUserId ?? ''),
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
    quotas,
  }
}

const textOrNull = (value: string) => value.trim() || null

/** "10" → 10; vazio ou fora de 1–31 → null. */
function dueDayOrNull(value: string): number | null {
  const day = Number.parseInt(value, 10)
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null
}

function quotaFields(quota: QuotaForm): AdhesionQuotaFields {
  const prepaid = Number.parseInt(quota.prepaidInstallments, 10)
  return {
    administrator: textOrNull(quota.administrator),
    assetValueCents: quota.assetValue.trim() ? parseValueToCents(quota.assetValue) : null,
    assetCode: textOrNull(quota.assetCode),
    planTable: textOrNull(quota.planTable),
    assetType: textOrNull(quota.assetType),
    groupCode: textOrNull(quota.groupCode),
    quotaNumber: textOrNull(quota.quotaNumber),
    downPaymentCents: quota.downPayment.trim() ? parseValueToCents(quota.downPayment) : null,
    prepaidInstallments: Number.isNaN(prepaid) ? null : prepaid,
    paymentMethod: textOrNull(quota.paymentMethod),
    installmentDueDay: dueDayOrNull(quota.installmentDueDay),
  }
}

/** Campos da ficha (o que não é do lead) pra API. */
export function adhesionFields(form: AdhesionForm): LeadAdhesionFields {
  return {
    sellerUserId: textOrNull(form.sellerUserId),
    birthplace: textOrNull(form.birthplace),
    spouseName: needsSpouse(form.maritalStatus) ? textOrNull(form.spouseName) : null,
    phone2: textOrNull(form.phone2),
    address: textOrNull(form.address),
    zipCode: textOrNull(form.zipCode),
    preferredAdministrator: textOrNull(form.preferredAdministrator),
    contactHours: textOrNull(form.contactHours),
    notes: textOrNull(form.notes),
    quotas: form.quotas.map(quotaFields),
  }
}

/** Dados que moram no lead — só os que mudaram. O valor do lead vira a soma
 * das cotas (quando todas têm valor) e a quantidade de cotas, a da ficha. */
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
  const values = form.quotas.map((quota) =>
    quota.assetValue.trim() ? parseValueToCents(quota.assetValue) : null,
  )
  if (values.length > 0 && values.every((value): value is number => value !== null)) {
    const total = values.reduce((sum, value) => sum + value, 0)
    if (total > 0 && total !== card.valueCents) changes.valueCents = total
  }
  if (form.quotas.length > 0 && form.quotas.length !== (card.quotaCount ?? 1)) {
    changes.quotaCount = form.quotas.length
  }
  return changes
}

/** "74000-000" — só dígitos, com o hífen. */
export function formatZipCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

const MONEY_QUOTA_KEYS: ReadonlySet<keyof QuotaForm> = new Set(['assetValue', 'downPayment'])

/** Ficha em texto, pra colar no portal da administradora ou mandar no chat. */
export function adhesionText(
  form: AdhesionForm,
  context: { organizationName: string; sellerName: string | null },
): string {
  const money = (raw: string) => {
    const cents = parseValueToCents(raw)
    return cents === null ? '' : `R$ ${formatBRL(cents)}`
  }
  const personal = (item: AdhesionItem) =>
    item.key === 'sellerUserId'
      ? (context.sellerName ?? '')
      : item.key === 'income'
        ? money(form.income)
        : form[item.key].trim()
  const lines: string[] = [`FICHA DE ADESÃO — ${form.name.trim()}`, '']
  lines.push('VENDA', `Representação: ${context.organizationName}`)
  for (const item of ADHESION_ITEMS.filter((i) => i.section === 'venda')) {
    lines.push(`${item.label}: ${personal(item) || '—'}`)
  }
  lines.push('')
  form.quotas.forEach((quota, index) => {
    lines.push(
      form.quotas.length > 1 ? `COTA ${index + 1} DE ${form.quotas.length}` : 'DADOS DO PLANO',
    )
    for (const item of QUOTA_ITEMS) {
      const value = MONEY_QUOTA_KEYS.has(item.key) ? money(quota[item.key]) : quota[item.key].trim()
      lines.push(`${item.label}: ${value || '—'}`)
    }
    lines.push('')
  })
  for (const [section, title] of [
    ['pessoais', 'DADOS PESSOAIS'],
    ['preferencias', 'PREFERÊNCIAS'],
  ] as const) {
    lines.push(title)
    for (const item of ADHESION_ITEMS.filter((i) => i.section === section)) {
      if (item.key === 'spouseName' && !needsSpouse(form.maritalStatus)) continue
      lines.push(`${item.label}: ${personal(item) || '—'}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}
