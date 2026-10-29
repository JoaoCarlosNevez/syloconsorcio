// Peças do início do celular, usadas por todos os perfis: o cabeçalho com
// saudação e foto, os leads da fila esperando aceite e os cartões de número.

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useMyLeadOffersQuery } from '../../hooks/useLeadQueue'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { formatCountdown } from '../../lib/lead-queue-api'
import { formatMoney } from '../../lib/mobile'
import styles from './Mobile.module.css'
import { BoltIcon } from './icons'

function greeting(date: Date): string {
  const hour = date.getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

/** Saudação + foto; `subtitle` troca a data (ex: nome da organização). */
export function HomeHeader({ now, subtitle }: { now: number; subtitle?: string }) {
  const today = new Date(now)
  const { membership } = useActiveOrganization()
  const { data: user } = useCurrentUser()
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? ''
  return (
    <div className={styles.top}>
      <div>
        <p className={styles.eyebrow}>
          {subtitle ??
            today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className={styles.title}>
          {greeting(today)}
          {firstName ? `, ${firstName}` : ''}
        </h1>
      </div>
      <Link
        to="/m/avisos"
        className={styles.avatar}
        aria-label={membership?.organizationName ?? 'Perfil'}
      >
        <span className={styles.avatarInner}>
          {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user?.name ?? '?')}
        </span>
      </Link>
    </div>
  )
}

/** Leads da fila esperando o aceite do usuário, com a contagem regressiva. */
export function OfferCards({ now }: { now: number }) {
  const { organizationId } = useActiveOrganization()
  const offers = useMyLeadOffersQuery(organizationId)
  const open = (offers.data?.offers ?? []).filter(
    (offer) => new Date(offer.expiresAt).getTime() > now,
  )
  return (
    <>
      {open.map((offer) => (
        <Link key={offer.id} to={`/m/oferta/${offer.id}`} className={styles.offerCard}>
          <span className={`${styles.iconBox} ${styles.iconOffer}`}>
            <BoltIcon />
          </span>
          <div className={styles.grow}>
            <b>Lead da fila esperando você</b>
            <p className={styles.note}>
              {offer.lead.name} · {offer.lead.segment} · {formatMoney(offer.lead.valueCents)}
            </p>
          </div>
          <span className={styles.offerTime}>{formatCountdown(offer.expiresAt, now)}</span>
        </Link>
      ))}
    </>
  )
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={styles.statGrid}>{children}</div>
}

export function Stat({
  label,
  value,
  caption,
  tone = 'default',
  to,
}: {
  label: string
  value: string
  caption?: string
  tone?: 'default' | 'danger' | 'ok'
  to?: string
}) {
  const className = `${styles.card} ${styles.stat} ${tone === 'danger' ? styles.statDanger : ''} ${tone === 'ok' ? styles.statOk : ''}`
  const body = (
    <>
      <span className={styles.statLabel}>{label}</span>
      <strong className={styles.statValue}>{value}</strong>
      {caption && <span className={styles.statCaption}>{caption}</span>}
    </>
  )
  return to ? (
    <Link to={to} className={`${className} ${styles.rowLink}`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

/** Barra de progresso da meta (0–100+). */
export function GoalBar({ percent }: { percent: number | null }) {
  const width = Math.min(100, Math.max(0, percent ?? 0))
  return (
    <div className={styles.goalTrack}>
      <div className={styles.goalFill} style={{ width: `${width}%` }} />
    </div>
  )
}
