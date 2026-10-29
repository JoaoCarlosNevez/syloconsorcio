// Tarefas do vendedor no celular, por dia: atrasadas, hoje, amanhã e depois.
// Criar tarefa pra outra pessoa e o calendário ficam no computador.

import { Skeleton } from '@sylocrm/ui'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useTasksQuery } from '../../hooks/useTasks'
import { type TaskGroup, groupTasks } from '../../lib/mobile'
import styles from './Mobile.module.css'
import { TaskRow } from './TaskRow'

const GROUPS: { key: TaskGroup; label: string }[] = [
  { key: 'atrasadas', label: 'Atrasadas' },
  { key: 'hoje', label: 'Hoje' },
  { key: 'amanha', label: 'Amanhã' },
  { key: 'depois', label: 'Depois' },
]

export function MobileTasksPage() {
  const { organizationId } = useActiveOrganization()
  const tasks = useTasksQuery(organizationId, { mine: true, status: 'abertas', pageSize: 100 })
  const now = new Date()
  const groups = groupTasks(tasks.data?.items ?? [], now)
  const empty = (tasks.data?.items.length ?? 0) === 0

  return (
    <main className={styles.content}>
      <div className={styles.top}>
        <h1 className={styles.title}>Tarefas</h1>
      </div>
      {tasks.isLoading ? (
        <div className={`${styles.card} ${styles.list}`}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.row}>
              <Skeleton width="100%" height={36} />
            </div>
          ))}
        </div>
      ) : empty ? (
        <p className={styles.empty}>Nenhuma tarefa aberta.</p>
      ) : (
        GROUPS.filter((group) => groups[group.key].length > 0).map((group) => (
          <section key={group.key}>
            <h2 className={styles.sectionTitle}>{group.label}</h2>
            <div className={`${styles.card} ${styles.list}`}>
              {groups[group.key].map((task) => (
                <TaskRow key={task.id} task={task} now={now} />
              ))}
            </div>
          </section>
        ))
      )}
      <p className={styles.note}>
        Criar tarefa pra outra pessoa e ver o calendário continuam no computador.
      </p>
    </main>
  )
}
