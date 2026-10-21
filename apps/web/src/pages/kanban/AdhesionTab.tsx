// AdhesionTab — aba "Adesão" do lead: checklist com tudo que o vendedor
// precisa pra fazer a adesão na administradora, preenchido ainda na etapa da
// venda. Dados pessoais que o lead já tem (nome, telefone, e-mail, profissão,
// renda, estado civil) são salvos no próprio lead; o resto na ficha de
// adesão. Lógica do checklist em lib/adhesion-checklist.ts.

import { Skeleton, useToast } from '@sylocrm/ui'
import { useEffect, useState } from 'react'
import type { CardData } from '../../data/kanban-mock'
import {
  useAdhesionDocumentsQuery,
  useLeadAdhesionQuery,
  useSaveLeadAdhesion,
  useUpdateLead,
} from '../../hooks/useLeads'
import {
  ADHESION_ITEMS,
  type AdhesionForm,
  type AdhesionItem,
  type AdhesionSection,
  PAYMENT_METHOD_OPTIONS,
  adhesionFields,
  adhesionProgress,
  adhesionText,
  buildAdhesionForm,
  formatZipCode,
  isFilled,
  leadChanges,
} from '../../lib/adhesion-checklist'
import { formatMoneyInput, formatPhoneBR } from '../../lib/lead-adapters'
import type { LeadProposal } from '../../lib/leads-api'
import type { TeamMember } from '../../lib/team-api'
import { AdhesionDocuments } from './AdhesionDocuments'
import styles from './AdhesionTab.module.css'

const MARITAL_STATUS_OPTIONS = [
  'Solteiro(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viúvo(a)',
  'União Estável',
]

const SECTIONS: { key: AdhesionSection; title: string }[] = [
  { key: 'venda', title: 'Venda' },
  { key: 'plano', title: 'Dados do plano' },
  { key: 'pessoais', title: 'Dados pessoais' },
  { key: 'preferencias', title: 'Preferências' },
]

const MONEY_KEYS: ReadonlySet<keyof AdhesionForm> = new Set(['assetValue', 'downPayment', 'income'])
const PHONE_KEYS: ReadonlySet<keyof AdhesionForm> = new Set(['phone', 'phone2'])

const PLACEHOLDER: Partial<Record<keyof AdhesionForm, string>> = {
  administrator: 'Ex: Porto Seguro, Embracon…',
  assetCode: 'Código na tabela da administradora',
  planTable: 'Ex: Imóvel Plano Leve 200',
  groupCode: 'Ex: 1234',
  prepaidInstallments: 'Quantidade',
  birthplace: 'Cidade/UF',
  address: 'Rua, número, complemento, bairro, cidade/UF',
  zipCode: '00000-000',
  preferredAdministrator: 'Se o cliente preferir alguma',
  contactHours: 'Ex: dias úteis depois das 18h',
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

/** CEP → endereço pela ViaCEP (pública, sem chave). null se não achar. */
async function lookupZipCode(zipCode: string): Promise<string | null> {
  const digits = zipCode.replace(/\D/g, '')
  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  if (!response.ok) return null
  const data = (await response.json()) as {
    erro?: boolean
    logradouro?: string
    bairro?: string
    localidade?: string
    uf?: string
  }
  if (data.erro) return null
  const street = [data.logradouro, data.bairro].filter(Boolean).join(' — ')
  return `${street ? `${street}, ` : ''}${data.localidade ?? ''}/${data.uf ?? ''}`
}

export function AdhesionTab({
  organizationId,
  organizationName,
  card,
  members,
  segments,
  latestProposal,
}: {
  organizationId: string | null
  organizationName: string
  card: CardData
  members: TeamMember[]
  segments: string[]
  latestProposal: LeadProposal | null
}) {
  const { data, isLoading } = useLeadAdhesionQuery(organizationId, card.id)
  const documentsQuery = useAdhesionDocumentsQuery(organizationId, card.id)
  const saveAdhesion = useSaveLeadAdhesion(organizationId, card.id)
  const updateLead = useUpdateLead(organizationId)
  const { toast } = useToast()
  const [form, setForm] = useState<AdhesionForm | null>(null)
  const [dirty, setDirty] = useState(false)

  // Monta o formulário quando a ficha chega (e de novo se trocar de lead).
  // De propósito NÃO depende de card/latestProposal: eles mudam a cada
  // refetch do lead e remontar apagaria o que a pessoa está digitando.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentário acima
  useEffect(() => {
    if (!data) return
    setForm(buildAdhesionForm(card, data.adhesion, latestProposal))
    // Sem ficha salva, as sugestões (vendedor, valor, tabela…) ainda não
    // estão gravadas — o botão já começa liberado.
    setDirty(data.adhesion === null)
  }, [data, card.id])

  if (isLoading || !form) {
    return (
      <div className={styles.loading}>
        <Skeleton width="40%" height={16} />
        <Skeleton width="100%" height={8} />
        <Skeleton width="100%" height={220} />
      </div>
    )
  }

  const uploadedKinds = new Set((documentsQuery.data?.documents ?? []).map((d) => d.kind))
  const progress = adhesionProgress(form, uploadedKinds)
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0
  const activeMembers = members.filter((m) => m.status === 'ACTIVE')
  const sellerName =
    activeMembers.find((m) => m.userId === form.sellerUserId)?.name ??
    members.find((m) => m.userId === form.sellerUserId)?.email ??
    null
  const typeOptions = [...new Set([...segments, form.assetType].filter(Boolean))]
  const isSaving = saveAdhesion.isPending || updateLead.isPending

  function update(key: keyof AdhesionForm, raw: string) {
    let value = raw
    if (MONEY_KEYS.has(key)) value = formatMoneyInput(raw)
    else if (PHONE_KEYS.has(key)) value = formatPhoneBR(raw)
    else if (key === 'zipCode') value = formatZipCode(raw)
    else if (key === 'prepaidInstallments') value = raw.replace(/\D/g, '').slice(0, 3)
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
    setDirty(true)
    if (key === 'zipCode' && value.replace(/\D/g, '').length === 8) void fillAddress(value)
  }

  async function fillAddress(zipCode: string) {
    try {
      const address = await lookupZipCode(zipCode)
      if (!address) {
        toast({ type: 'warning', title: 'CEP não encontrado', description: 'Confira o número.' })
        return
      }
      // Só preenche o endereço se ainda estiver vazio — não apaga o número.
      setForm((prev) => (prev && !prev.address.trim() ? { ...prev, address } : prev))
    } catch (error) {
      toast({
        type: 'warning',
        title: 'Não foi possível buscar o CEP',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  async function handleSave() {
    if (!form) return
    try {
      const changes = leadChanges(form, card)
      if (Object.keys(changes).length > 0) {
        await updateLead.mutateAsync({ id: card.id, payload: changes })
      }
      await saveAdhesion.mutateAsync(adhesionFields(form))
      setDirty(false)
      toast({
        type: 'success',
        title: 'Ficha de adesão salva',
        description:
          progress.missing.length === 0
            ? 'Checklist completo.'
            : `Faltam ${progress.missing.length} item(ns) obrigatório(s).`,
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível salvar a ficha',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  async function handleCopy() {
    if (!form) return
    const text = adhesionText(form, { organizationName, sellerName })
    try {
      await navigator.clipboard.writeText(text)
      toast({
        type: 'success',
        title: 'Ficha copiada',
        description: 'Cole no portal da administradora.',
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível copiar',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  function renderInput(item: AdhesionItem) {
    if (!form) return null
    const id = `adhesion-${item.key}`
    const value = form[item.key]
    if (item.key === 'sellerUserId') {
      return (
        <select
          id={id}
          className={styles.input}
          value={value}
          onChange={(e) => update(item.key, e.target.value)}
        >
          <option value="">Selecione…</option>
          {activeMembers.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.name ?? member.email}
            </option>
          ))}
        </select>
      )
    }
    if (item.key === 'paymentMethod') {
      const options = [...new Set([...PAYMENT_METHOD_OPTIONS, value].filter(Boolean))]
      return (
        <select
          id={id}
          className={styles.input}
          value={value}
          onChange={(e) => update(item.key, e.target.value)}
        >
          <option value="">Selecione…</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
    }
    if (item.key === 'maritalStatus') {
      return (
        <select
          id={id}
          className={styles.input}
          value={value}
          onChange={(e) => update(item.key, e.target.value)}
        >
          <option value="">Selecione…</option>
          {MARITAL_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
    }
    if (item.key === 'assetType') {
      return (
        <select
          id={id}
          className={styles.input}
          value={value}
          onChange={(e) => update(item.key, e.target.value)}
        >
          <option value="">Selecione…</option>
          {typeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
    }
    if (item.key === 'notes' || item.key === 'address') {
      return (
        <textarea
          id={id}
          className={`${styles.input} ${styles.textarea}`}
          rows={item.key === 'notes' ? 3 : 2}
          placeholder={PLACEHOLDER[item.key]}
          value={value}
          onChange={(e) => update(item.key, e.target.value)}
        />
      )
    }
    return (
      <div className={MONEY_KEYS.has(item.key) ? styles.moneyWrap : undefined}>
        {MONEY_KEYS.has(item.key) && <span className={styles.moneyPrefix}>R$</span>}
        <input
          id={id}
          className={styles.input}
          inputMode={
            MONEY_KEYS.has(item.key) || item.key === 'prepaidInstallments' || item.key === 'zipCode'
              ? 'numeric'
              : PHONE_KEYS.has(item.key)
                ? 'tel'
                : item.key === 'email'
                  ? 'email'
                  : undefined
          }
          placeholder={PLACEHOLDER[item.key]}
          value={value}
          onChange={(e) => update(item.key, e.target.value)}
        />
      </div>
    )
  }

  return (
    <div className={styles.tab}>
      <div className={styles.progressCard}>
        <div className={styles.progressHeader}>
          <div>
            <span className={styles.progressTitle}>Checklist da adesão</span>
            <span className={styles.progressCount}>
              {progress.done} de {progress.total} obrigatórios
            </span>
          </div>
          <span className={percent === 100 ? styles.badgeDone : styles.badgePending}>
            {percent === 100 ? 'Pronto pra adesão' : `${percent}%`}
          </span>
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${percent}%` }} />
        </div>
        {progress.missing.length > 0 && (
          <p className={styles.missing}>Falta: {progress.missing.join(', ')}</p>
        )}
      </div>

      <div className={styles.representation}>
        <span className={styles.label}>Representação</span>
        <span className={styles.representationName}>{organizationName}</span>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.key} className={styles.section}>
          <h3 className={styles.sectionTitle}>{section.title}</h3>
          <div className={styles.grid}>
            {ADHESION_ITEMS.filter(
              (item) =>
                item.section === section.key && (item.key !== 'spouseName' || item.required(form)),
            ).map((item) => {
              const filled = isFilled(form, item.key)
              const required = item.required(form)
              return (
                <div
                  key={item.key}
                  className={
                    item.key === 'notes' || item.key === 'address'
                      ? `${styles.field} ${styles.fieldWide}`
                      : styles.field
                  }
                >
                  <label htmlFor={`adhesion-${item.key}`} className={styles.label}>
                    <span
                      className={
                        filled
                          ? styles.checkDone
                          : required
                            ? styles.checkMissing
                            : styles.checkOptional
                      }
                      aria-hidden="true"
                    >
                      {filled && <CheckIcon />}
                    </span>
                    {item.label}
                    {!required && <span className={styles.optional}>(opcional)</span>}
                  </label>
                  {renderInput(item)}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Documentos</h3>
        <AdhesionDocuments organizationId={organizationId} leadId={card.id} />
      </section>

      <div className={styles.actions}>
        <button type="button" className={styles.copyBtn} onClick={handleCopy}>
          <CopyIcon />
          Copiar ficha
        </button>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={isSaving || !dirty}
        >
          {isSaving ? 'Salvando…' : dirty ? 'Salvar ficha' : 'Ficha salva'}
        </button>
      </div>
    </div>
  )
}
