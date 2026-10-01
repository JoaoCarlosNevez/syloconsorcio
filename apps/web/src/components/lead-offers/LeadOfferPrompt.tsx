// LeadOfferPrompt — card fixo no canto da tela quando a Fila de Leads oferece
// um lead ao usuário: contagem regressiva do prazo e Aceitar/Recusar. Montado
// no ProtectedRoute, então aparece em qualquer página do app.
//
// Aceitar leva pro lead no Kanban. Se o prazo acabar, o card some sozinho
// (o lead já foi pro próximo da fila).

import { useToast } from '@sylocrm/ui'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyLeadOffersQuery, useRespondLeadOffer } from '../../hooks/useLeadQueue'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { formatBRL } from '../../lib/lead-adapters'
import { type MyLeadOffer, formatCountdown } from '../../lib/lead-queue-api'
import styles from './LeadOfferPrompt.module.css'

function InboxIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}

/** Relógio que só anda enquanto há oferta na tela. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  return now
}

export function LeadOfferPrompt() {
  const { organizationId } = useActiveOrganization()
  const { data } = useMyLeadOffersQuery(organizationId)
  const { accept, decline } = useRespondLeadOffer(organizationId)
  const { toast } = useToast()
  const navigate = useNavigate()
  const offers = data?.offers ?? []
  const now = useNow(offers.length > 0)
  const visible = offers.filter((offer) => new Date(offer.expiresAt).getTime() > now)

  if (visible.length === 0) return null

  function handleAccept(offer: MyLeadOffer) {
    accept.mutate(offer.id, {
      onSuccess: ({ lead }) => {
        toast({ type: 'success', title: `Lead ${offer.lead.name} é seu` })
        navigate('/app/kanban', { state: { openLeadId: lead.id, funnelId: lead.funnelId } })
      },
      onError: (error) => {
        toast({
          type: 'error',
          title: 'Não foi possível aceitar o lead',
          description: error instanceof Error ? error.message : undefined,
        })
      },
    })
  }

  function handleDecline(offer: MyLeadOffer) {
    decline.mutate(offer.id, {
      onSuccess: () => toast({ type: 'info', title: 'Lead passado pro próximo da fila' }),
      onError: (error) => {
        toast({
          type: 'error',
          title: 'Não foi possível recusar o lead',
          description: error instanceof Error ? error.message : undefined,
        })
      },
    })
  }

  const busy = accept.isPending || decline.isPending

  return (
    <section className={styles.stack} aria-label="Leads aguardando seu aceite">
      {visible.map((offer) => (
        <div key={offer.id} className={styles.card} role="alertdialog" aria-live="assertive">
          <div className={styles.header}>
            <span className={styles.icon}>
              <InboxIcon />
            </span>
            <div className={styles.headerText}>
              <span className={styles.eyebrow}>Novo lead pra você</span>
              <span className={styles.name}>{offer.lead.name}</span>
            </div>
            <span className={styles.countdown} title="Tempo pra aceitar">
              {formatCountdown(offer.expiresAt, now)}
            </span>
          </div>
          <p className={styles.details}>
            {offer.lead.segment}
            {offer.lead.valueCents > 0 && ` · R$ ${formatBRL(offer.lead.valueCents)}`}
            {` · ${offer.lead.source}`}
          </p>
          <p className={styles.hint}>Se não aceitar a tempo, o lead vai pro próximo da fila.</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.declineBtn}
              onClick={() => handleDecline(offer)}
              disabled={busy}
            >
              Recusar
            </button>
            <button
              type="button"
              className={styles.acceptBtn}
              onClick={() => handleAccept(offer)}
              disabled={busy}
            >
              Aceitar lead
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}
