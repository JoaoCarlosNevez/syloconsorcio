// Oferta da Fila de Leads no celular: contagem regressiva com aceitar ou
// recusar. Sem resposta no prazo, o lead passa pro próximo da fila.

import { Skeleton } from '@sylocrm/ui'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMyLeadOffersQuery, useRespondLeadOffer } from '../../hooks/useLeadQueue'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { formatCountdown } from '../../lib/lead-queue-api'
import { formatMoney } from '../../lib/mobile'
import styles from './Mobile.module.css'
import { BackBar, useNow } from './MobileUi'

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function MobileOfferPage() {
  const { offerId = '' } = useParams()
  const navigate = useNavigate()
  const now = useNow()
  const { organizationId } = useActiveOrganization()
  const offers = useMyLeadOffersQuery(organizationId)
  const { accept, decline } = useRespondLeadOffer(organizationId)
  const [error, setError] = useState<string | null>(null)

  const offer = offers.data?.offers.find((o) => o.id === offerId)

  // Aberto pelo push com o app já carregado, a lista em cache ainda não tem a
  // oferta nova — espera a releitura antes de dizer que ela passou.
  if (offers.isLoading || (!offer && offers.isFetching)) {
    return (
      <main className={styles.content}>
        <Skeleton variant="circle" width={150} height={150} />
        <Skeleton width="100%" height={140} />
      </main>
    )
  }

  const expiresAt = offer ? new Date(offer.expiresAt).getTime() : 0
  if (!offer || expiresAt <= now) {
    return (
      <main className={`${styles.content} ${styles.centered}`}>
        <h1 className={styles.title}>Essa oferta já passou</h1>
        <p className={styles.note}>
          O prazo acabou ou o lead já foi respondido. Quando chegar outro, você recebe um aviso.
        </p>
        <Link to="/m" className={`${styles.btn} ${styles.btnLine}`}>
          Voltar pro início
        </Link>
      </main>
    )
  }

  const total = expiresAt - new Date(offer.offeredAt).getTime()
  const left = Math.max(0, expiresAt - now)
  const offset = CIRCUMFERENCE * (1 - (total > 0 ? left / total : 0))

  async function onAccept() {
    setError(null)
    try {
      const { lead } = await accept.mutateAsync(offerId)
      navigate(`/m/leads/${lead.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu pra aceitar.')
    }
  }

  async function onDecline() {
    setError(null)
    try {
      await decline.mutateAsync(offerId)
      navigate('/m', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu pra recusar.')
    }
  }

  return (
    <main className={`${styles.content} ${styles.offer}`}>
      <BackBar label="Depois" />
      <div className={styles.ring}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle
            className={styles.ringTrack}
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            strokeWidth="9"
          />
          <circle
            className={styles.ringProgress}
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <div className={styles.ringText}>
          <b>{formatCountdown(offer.expiresAt, now)}</b>
          <span>pra aceitar</span>
        </div>
      </div>
      <div>
        <p className={styles.eyebrow}>Lead da fila · {offer.lead.source}</p>
        <h1 className={styles.title}>{offer.lead.name}</h1>
      </div>
      <dl className={`${styles.card} ${styles.facts}`}>
        <div>
          <dt>Segmento</dt>
          <dd>{offer.lead.segment}</dd>
        </div>
        <div>
          <dt>Crédito desejado</dt>
          <dd>{formatMoney(offer.lead.valueCents)}</dd>
        </div>
        <div>
          <dt>Chegou</dt>
          <dd>
            {new Date(offer.offeredAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </dd>
        </div>
      </dl>
      <p className={styles.note}>
        Se você não responder, o lead passa pro próximo vendedor da fila.
      </p>
      {error && <p className={styles.error}>{error}</p>}
      <div className={`${styles.two} ${styles.fullWidth}`}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnLine}`}
          disabled={accept.isPending || decline.isPending}
          onClick={onDecline}
        >
          Recusar
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={accept.isPending || decline.isPending}
          onClick={onAccept}
        >
          {accept.isPending ? 'Aceitando…' : 'Aceitar lead'}
        </button>
      </div>
    </main>
  )
}
