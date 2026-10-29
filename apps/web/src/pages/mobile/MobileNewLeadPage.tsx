// Novo lead pelo celular (indicação, evento, porta a porta): entra na
// primeira etapa do funil Comercial, já com o vendedor como responsável.

import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFunnelsQuery } from '../../hooks/useFunnels'
import { useCreateLead } from '../../hooks/useLeads'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useOrganizationSettingsQuery } from '../../hooks/useOrganizationSettings'
import { parseMoneyToCents } from '../../lib/mobile'
import styles from './Mobile.module.css'
import { BackBar } from './MobileUi'

const FALLBACK_SEGMENTS = ['Imóvel', 'Auto', 'Pesados']
const FALLBACK_SOURCES = ['Indicação', 'Evento', 'Porta a porta', 'Outro']

export function MobileNewLeadPage() {
  const navigate = useNavigate()
  const { organizationId } = useActiveOrganization()
  const funnels = useFunnelsQuery(organizationId)
  const settings = useOrganizationSettingsQuery(organizationId)
  const createLead = useCreateLead(organizationId)

  const segments = settings.data?.organization.leadSegments?.length
    ? settings.data.organization.leadSegments
    : FALLBACK_SEGMENTS
  const sources = settings.data?.organization.leadSources?.length
    ? settings.data.organization.leadSources
    : FALLBACK_SOURCES

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [segment, setSegment] = useState('')
  const [credit, setCredit] = useState('')
  const [source, setSource] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const commercial = funnels.data?.funnels.find((funnel) => funnel.kind === 'COMMERCIAL')
    if (!commercial) return setError('Funil Comercial não encontrado.')
    if (!name.trim() || phone.replace(/\D/g, '').length < 10) {
      return setError('Informe o nome e um telefone com DDD.')
    }
    try {
      const lead = await createLead.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        segment: segment || (segments[0] ?? ''),
        source: source || (sources[0] ?? ''),
        valueCents: parseMoneyToCents(credit),
        funnelId: commercial.id,
        notes: notes.trim() || null,
      })
      navigate(`/m/leads/${lead.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu pra salvar o lead.')
    }
  }

  return (
    <main className={styles.content}>
      <BackBar label="Cancelar" fallback="/m/leads" />
      <h1 className={styles.title}>Novo lead</h1>
      <form className={styles.form} onSubmit={onSubmit}>
        <label className={styles.field}>
          Nome
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            required
          />
        </label>
        <label className={styles.field}>
          Telefone (WhatsApp)
          <input
            className={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="(11) 99999-9999"
            required
          />
        </label>
        <label className={styles.field}>
          Segmento
          <select
            className={styles.input}
            value={segment || segments[0]}
            onChange={(e) => setSegment(e.target.value)}
          >
            {segments.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Crédito desejado (R$)
          <input
            className={styles.input}
            value={credit}
            onChange={(e) => setCredit(e.target.value)}
            inputMode="numeric"
            placeholder="250.000"
          />
        </label>
        <label className={styles.field}>
          Origem
          <select
            className={styles.input}
            value={source || sources[0]}
            onChange={(e) => setSource(e.target.value)}
          >
            {sources.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Observação
          <textarea
            className={styles.input}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opcional"
          />
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <button
          type="submit"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={createLead.isPending}
        >
          {createLead.isPending ? 'Salvando…' : 'Salvar lead'}
        </button>
        <p className={styles.note}>
          O lead entra na primeira etapa do funil Comercial, já atribuído a você.
        </p>
      </form>
    </main>
  )
}
