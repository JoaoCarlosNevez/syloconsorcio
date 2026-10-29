// Início do Administrativo no celular: quantos cards há em cada etapa do ADM
// e do Pós-venda, os mais parados do ADM e as tarefas de hoje. Tocar numa
// etapa abre a lista dela (aba Funis).

import { Skeleton } from '@sylocrm/ui'
import { Link } from 'react-router-dom'
import { useFunnelsQuery } from '../../hooks/useFunnels'
import { useLeadsQuery } from '../../hooks/useLeads'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useTasksQuery } from '../../hooks/useTasks'
import { useTeamMembersQuery } from '../../hooks/useTeam'
import type { Funnel } from '../../lib/funnels-api'
import { groupTasks } from '../../lib/mobile'
import { daysSince } from '../../lib/mobile-profile'
import { HomeHeader } from './HomeParts'
import styles from './Mobile.module.css'
import { useNow } from './MobileUi'
import { PushCard } from './PushCard'
import { TaskRow } from './TaskRow'

/** Card parado há mais que isto no ADM pede atenção (mesma régua do painel). */
const ADM_STALE_DAYS = 2

function FunnelStages({ funnel, kind }: { funnel: Funnel; kind: 'adm' | 'pos' }) {
  return (
    <section>
      <h2 className={styles.sectionTitle}>{funnel.name}</h2>
      <div className={`${styles.card} ${styles.list}`}>
        {funnel.stages.map((stage) => (
          <Link
            key={stage.id}
            to={`/m/leads?funil=${kind}&etapa=${stage.id}`}
            className={styles.row}
          >
            <span className={styles.stageBar} style={{ background: stage.color }} />
            <span className={styles.grow}>{stage.name}</span>
            <span className={styles.count}>{stage.leadCount ?? 0}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function BackofficeHome() {
  const now = useNow(30_000)
  const today = new Date(now)
  const { organizationId } = useActiveOrganization()
  const funnels = useFunnelsQuery(organizationId)
  const team = useTeamMembersQuery(organizationId)
  const tasks = useTasksQuery(organizationId, { mine: true, status: 'abertas', pageSize: 100 })

  const adm = funnels.data?.funnels.find((f) => f.kind === 'BACKOFFICE') ?? null
  const postSale = funnels.data?.funnels.find((f) => f.kind === 'POST_SALE') ?? null
  const admLeads = useLeadsQuery(adm ? organizationId : null, {
    funnelId: adm?.id,
    outcome: 'aberto',
    pageSize: 100,
  })

  const sellerName = (userId: string | null) =>
    team.data?.members.find((m) => m.userId === userId)?.name ?? 'Sem vendedor'
  const stageName = (stageId: string) => adm?.stages.find((s) => s.id === stageId)?.name ?? ''
  const stale = [...(admLeads.data?.items ?? [])]
    .filter((lead) => daysSince(lead.stageChangedAt, today) > ADM_STALE_DAYS)
    .sort((a, b) => a.stageChangedAt.localeCompare(b.stageChangedAt))
    .slice(0, 8)
  const groups = groupTasks(tasks.data?.items ?? [], today)
  const todayTasks = [...groups.atrasadas, ...groups.hoje]

  return (
    <main className={styles.content}>
      <HomeHeader now={now} />
      <PushCard hideWhenOn />

      {funnels.isLoading ? (
        <>
          <Skeleton width="100%" height={200} />
          <Skeleton width="100%" height={200} />
        </>
      ) : (
        <>
          {adm && <FunnelStages funnel={adm} kind="adm" />}

          <section>
            <h2 className={styles.sectionTitle}>
              Parados no ADM <small>há mais de {ADM_STALE_DAYS} dias</small>
            </h2>
            <div className={`${styles.card} ${styles.list}`}>
              {admLeads.isLoading ? (
                <div className={styles.row}>
                  <Skeleton width="100%" height={36} />
                </div>
              ) : stale.length === 0 ? (
                <p className={styles.empty}>Nada parado no ADM. Tudo andando.</p>
              ) : (
                stale.map((lead) => (
                  <Link key={lead.id} to={`/m/leads/${lead.id}`} className={styles.row}>
                    <div className={styles.grow}>
                      <span className={styles.rowTitle}>{lead.name}</span>
                      <div className={styles.rowSub}>
                        {stageName(lead.stageId)} · {sellerName(lead.assignedUserId)}
                      </div>
                    </div>
                    <span className={`${styles.time} ${styles.late}`}>
                      {daysSince(lead.stageChangedAt, today)}d
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>

          {postSale && <FunnelStages funnel={postSale} kind="pos" />}
        </>
      )}

      <section>
        <h2 className={styles.sectionTitle}>
          Tarefas de hoje <small>{todayTasks.length}</small>
        </h2>
        <div className={`${styles.card} ${styles.list}`}>
          {tasks.isLoading ? (
            <div className={styles.row}>
              <Skeleton width="100%" height={36} />
            </div>
          ) : todayTasks.length === 0 ? (
            <p className={styles.empty}>Nenhuma tarefa pra hoje.</p>
          ) : (
            todayTasks.map((task) => <TaskRow key={task.id} task={task} now={today} />)
          )}
        </div>
      </section>
    </main>
  )
}
