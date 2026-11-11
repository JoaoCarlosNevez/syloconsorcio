// Linha de tarefa do celular: concluir com um toque; tocar no texto abre o
// lead da tarefa (quando tem). Tarefa na fila de um setor mostra "Pegar".

import { Link } from 'react-router-dom'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useClaimTask, useUpdateTask } from '../../hooks/useTasks'
import { taskGroup, taskTimeLabel } from '../../lib/mobile'
import { SECTOR_LABEL } from '../../lib/sectors'
import type { Task } from '../../lib/tasks-api'
import styles from './Mobile.module.css'
import { TickIcon } from './icons'

export function TaskRow({ task, now }: { task: Task; now: Date }) {
  const { organizationId } = useActiveOrganization()
  const updateTask = useUpdateTask(organizationId)
  const claimTask = useClaimTask(organizationId)
  const done = task.status === 'concluida'
  const late = !done && taskGroup(task, now) === 'atrasadas'
  const queued = task.assignedUserId === null && task.assignedSector !== null

  const body = (
    <>
      <span className={styles.rowTitle}>{task.title}</span>
      <div className={styles.rowSub}>
        <span className={styles.badge}>{task.type}</span>
        {queued && task.assignedSector && (
          <span className={styles.badge}>Fila {SECTOR_LABEL[task.assignedSector]}</span>
        )}
      </div>
    </>
  )

  return (
    <div className={`${styles.row} ${done ? styles.rowDone : ''}`}>
      <button
        type="button"
        className={`${styles.check} ${done ? styles.checkOn : ''}`}
        aria-label={done ? 'Reabrir tarefa' : 'Concluir tarefa'}
        disabled={updateTask.isPending}
        onClick={() =>
          updateTask.mutate({
            id: task.id,
            payload: { status: done ? 'pendente' : 'concluida' },
          })
        }
      >
        {done ? <TickIcon /> : null}
      </button>
      {task.leadId ? (
        <Link to={`/m/leads/${task.leadId}`} className={`${styles.grow} ${styles.rowLink}`}>
          {body}
        </Link>
      ) : (
        <div className={styles.grow}>{body}</div>
      )}
      {queued && !done ? (
        <button
          type="button"
          className={styles.chipButton}
          disabled={claimTask.isPending}
          onClick={() => claimTask.mutate(task.id)}
        >
          {claimTask.isPending ? '…' : 'Pegar'}
        </button>
      ) : (
        <span className={`${styles.time} ${late ? styles.late : ''}`}>
          {taskTimeLabel(task.dueAt, now)}
        </span>
      )}
    </div>
  )
}
