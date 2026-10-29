// Início do Vendedor no celular: lead da fila esperando, leads que acabaram de
// abrir a proposta e as tarefas de hoje (com as atrasadas).

import { Skeleton } from '@sylocrm/ui'
import { Link } from 'react-router-dom'
import { useNotificationsQuery } from '../../hooks/useNotifications'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useTasksQuery } from '../../hooks/useTasks'
import { groupTasks, hotLeads } from '../../lib/mobile'
import { HomeHeader, OfferCards } from './HomeParts'
import styles from './Mobile.module.css'
import { useNow } from './MobileUi'
import { PushCard } from './PushCard'
import { TaskRow } from './TaskRow'

export function SellerHome() {
  const now = useNow()
  const today = new Date(now)
  const { organizationId } = useActiveOrganization()
  const notifications = useNotificationsQuery(organizationId)
  const tasks = useTasksQuery(organizationId, { mine: true, status: 'abertas', pageSize: 100 })

  const hot = hotLeads(notifications.data?.items ?? [], today)
  const groups = groupTasks(tasks.data?.items ?? [], today)
  const todayTasks = [...groups.atrasadas, ...groups.hoje]

  return (
    <main className={styles.content}>
      <HomeHeader now={now} />
      <OfferCards now={now} />

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
