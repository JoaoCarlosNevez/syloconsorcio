// Início do app do celular: lead da fila esperando, leads que acabaram de
// abrir a proposta e as tarefas de hoje (com as atrasadas).

import { Skeleton } from '@sylocrm/ui'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useMyLeadOffersQuery } from '../../hooks/useLeadQueue'
import { useNotificationsQuery } from '../../hooks/useNotifications'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useTasksQuery } from '../../hooks/useTasks'
import { formatCountdown } from '../../lib/lead-queue-api'
import { formatMoney, groupTasks, hotLeads } from '../../lib/mobile'
import styles from './Mobile.module.css'
import { useNow } from './MobileUi'
import { PushCard } from './PushCard'
import { TaskRow } from './TaskRow'
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

export function MobileHomePage() {
  const now = useNow()
  const today = new Date(now)
  const { organizationId, membership } = useActiveOrganization()
  const { data: user } = useCurrentUser()
  const offers = useMyLeadOffersQuery(organizationId)
  const notifications = useNotificationsQuery(organizationId)
  const tasks = useTasksQuery(organizationId, { mine: true, status: 'abertas', pageSize: 100 })

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? ''
  const hot = hotLeads(notifications.data?.items ?? [], today)
  const groups = groupTasks(tasks.data?.items ?? [], today)
  const todayTasks = [...groups.atrasadas, ...groups.hoje]
  const openOffers = (offers.data?.offers ?? []).filter(
    (offer) => new Date(offer.expiresAt).getTime() > now,
  )

  return (
    <main className={styles.content}>
      <div className={styles.top}>
        <div>
          <p className={styles.eyebrow}>
            {today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
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

      {openOffers.map((offer) => (
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

      <PushCard hideWhenOn />

      <section>
        <h2 className={styles.sectionTitle}>
          Quentes agora <small>abriram a proposta</small>
        </h2>
        <div className={`${styles.card} ${styles.list}`}>
          {notifications.isLoading ? (
            <div className={styles.row}>
              <Skeleton width="100%" height={36} />
            </div>
          ) : hot.length === 0 ? (
            <p className={styles.empty}>Quando um cliente abrir sua proposta, ele aparece aqui.</p>
          ) : (
            hot.map((lead) => (
              <Link key={lead.leadId} to={`/m/leads/${lead.leadId}`} className={styles.row}>
                <span className={styles.hotDot} />
                <div className={styles.grow}>
                  <span className={styles.rowTitle}>{lead.name}</span>
                  <div className={styles.rowSub}>
                    Abriu às{' '}
                    {new Date(lead.viewedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <span className={`${styles.pill} ${styles.pillHot}`}>Ligar</span>
              </Link>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>
          Hoje{' '}
          <small>
            {todayTasks.length} pendente{todayTasks.length === 1 ? '' : 's'}
          </small>
        </h2>
        <div className={`${styles.card} ${styles.list}`}>
          {tasks.isLoading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className={styles.row}>
                <Skeleton width="100%" height={36} />
              </div>
            ))
          ) : todayTasks.length === 0 ? (
            <p className={styles.empty}>Nada pra hoje. Bom momento pra ligar pros leads novos.</p>
          ) : (
            todayTasks.map((task) => <TaskRow key={task.id} task={task} now={today} />)
          )}
        </div>
      </section>
    </main>
  )
}
