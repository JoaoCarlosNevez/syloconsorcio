// Edição dos dados do lead no celular — os mesmos atributos da aba
// Qualificação do web: contato, segmento, crédito, cotas e a ficha de
// qualificação (profissão, renda, estado civil, CPF).

import { type FormEvent, useState } from 'react'
import { useUpdateLead } from '../../hooks/useLeads'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useOrganizationSettingsQuery } from '../../hooks/useOrganizationSettings'
import {
  centsToMoneyInput,
  formatCPF,
  formatMoneyInput,
  formatPhoneBR,
} from '../../lib/lead-adapters'
import type { Lead } from '../../lib/leads-api'
import { type LeadEditForm, leadEditPayload } from '../../lib/mobile-lead-edit'
import styles from './Mobile.module.css'
import { Sheet } from './MobileUi'

const MARITAL_STATUS_OPTIONS = [
  'Solteiro(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viúvo(a)',
  'União Estável',
]

const FALLBACK_SEGMENTS = ['Imóvel', 'Auto', 'Pesados']

export function MobileLeadEditSheet({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead
  onClose: () => void
  onSaved: () => void
}) {
  const { organizationId } = useActiveOrganization()
  const settings = useOrganizationSettingsQuery(organizationId)
  const updateLead = useUpdateLead(organizationId)

  const configured = settings.data?.organization.leadSegments ?? []
  const segments = configured.length > 0 ? configured : FALLBACK_SEGMENTS
  // O segmento salvo continua na lista mesmo se saiu das Configurações.
  const segmentOptions = segments.includes(lead.segment) ? segments : [lead.segment, ...segments]

  const [form, setForm] = useState<LeadEditForm>({
    name: lead.name,
    phone: formatPhoneBR(lead.phone),
    email: lead.email ?? '',
    segment: lead.segment,
    value: centsToMoneyInput(lead.valueCents),
    quotaCount: String(lead.quotaCount),
    profession: lead.profession ?? '',
    income: lead.incomeCents != null ? centsToMoneyInput(lead.incomeCents) : '',
    maritalStatus: lead.maritalStatus ?? '',
    cpf: lead.cpf ? formatCPF(lead.cpf) : '',
  })
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof LeadEditForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const result = leadEditPayload(form)
    if (!result.ok) return setError(result.error)
    try {
      await updateLead.mutateAsync({ id: lead.id, payload: result.payload })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu pra salvar o lead.')
    }
  }

  return (
    <Sheet onClose={onClose}>
      <h3>Editar lead</h3>
      <form className={styles.form} onSubmit={onSubmit}>
        <label className={styles.field}>
          Nome
          <input
            className={styles.input}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            autoComplete="off"
            required
          />
        </label>
        <label className={styles.field}>
          Telefone (WhatsApp)
          <input
            className={styles.input}
            value={form.phone}
            onChange={(e) => set('phone', formatPhoneBR(e.target.value))}
            inputMode="tel"
            placeholder="(11) 99999-9999"
            required
          />
        </label>
        <label className={styles.field}>
          E-mail
          <input
            className={styles.input}
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            inputMode="email"
            autoCapitalize="none"
            placeholder="Opcional"
          />
        </label>
        <label className={styles.field}>
          Segmento
          <select
            className={styles.input}
            value={form.segment}
            onChange={(e) => set('segment', e.target.value)}
          >
            {segmentOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <div className={styles.two}>
          <label className={styles.field}>
            Crédito (R$)
            <input
              className={styles.input}
              value={form.value}
              onChange={(e) => set('value', formatMoneyInput(e.target.value))}
              inputMode="numeric"
              placeholder="250.000,00"
              required
            />
          </label>
          <label className={styles.field}>
            Cotas
            <input
              className={styles.input}
              value={form.quotaCount}
              onChange={(e) => set('quotaCount', e.target.value.replace(/\D/g, '').slice(0, 2))}
              inputMode="numeric"
            />
          </label>
        </div>

        <h4 className={styles.formSubtitle}>Ficha de qualificação</h4>
        <label className={styles.field}>
          Profissão
          <input
            className={styles.input}
            value={form.profession}
            onChange={(e) => set('profession', e.target.value)}
          />
        </label>
        <label className={styles.field}>
          Renda mensal (R$)
          <input
            className={styles.input}
            value={form.income}
            onChange={(e) => set('income', formatMoneyInput(e.target.value))}
            inputMode="numeric"
            placeholder="0,00"
          />
        </label>
        <label className={styles.field}>
          Estado civil
          <select
            className={styles.input}
            value={form.maritalStatus}
            onChange={(e) => set('maritalStatus', e.target.value)}
          >
            <option value="">Não informado</option>
            {MARITAL_STATUS_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          CPF
          <input
            className={styles.input}
            value={form.cpf}
            onChange={(e) => set('cpf', formatCPF(e.target.value))}
            inputMode="numeric"
            placeholder="000.000.000-00"
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}
        <button
          type="submit"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={updateLead.isPending}
        >
          {updateLead.isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
    </Sheet>
  )
}
