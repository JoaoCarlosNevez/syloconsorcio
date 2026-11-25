// Linha de tarefa do celular: concluir com um toque (o check gira e trava
// enquanto salva, pra não mandar duas vezes); tocar no texto abre a edição da
// tarefa — de lá dá pra abrir o lead. Sem permissão pra editar, o toque abre
// o lead direto. Tarefa na fila de um setor mostra "Pegar".

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Spinner } from '../../components/spinner/Spinner'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useClaimTask, useTasksChangingStatus, useUpdateTask } from '../../hooks/useTasks'
import { taskGroup, taskTimeLabel } from '../../lib/mobile'
import { canEditTask } from '../../lib/mobile-task'
import { SECTOR_LABEL } from '../../lib/sectors'
import type { Task } from '../../lib/tasks-api'
import styles from './Mobile.module.css'
import { MobileTaskSheet } from './MobileTaskSheet'
import { useToast } from './MobileUi'
import { TickIcon } from './icons'

export function TaskRow({ task, now }: { task: Task; now: Date }) {
  const { organizationId, membership } = useActiveOrganization()
  const { data: currentUser } = useCurrentUser()
  const updateTask = useUpdateTask(organizationId)
  const claimTask = useClaimTask(organizationId)
  const changing = useTasksChangingStatus(organizationId).has(task.id)
  const [editing, setEditing] = useState(false)
  const toast = useToast()
  const canEdit = canEditTask(
    task,
    currentUser?.id ?? null,
    membership?.permissions.includes('task.assign') ?? false,
  )
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
        aria-label={changing ? 'Salvando…' : done ? 'Reabrir tarefa' : 'Concluir tarefa'}
        aria-busy={changing}
        disabled={changing}
        onClick={() =>
          updateTask.mutate(
            { id: task.id, payload: { status: done ? 'pendente' : 'concluida' } },
            {
              onError: (error) =>
                toast.show(error instanceof Error ? error.message : 'Não deu pra salvar.'),
            },
          )
        }
      >
        {changing ? <Spinner size={14} /> : done ? <TickIcon /> : null}
      </button>
      {canEdit ? (
        <button
          type="button"
          className={`${styles.grow} ${styles.rowLink} ${styles.rowButton}`}
          onClick={() => setEditing(true)}
        >
          {body}
        </button>
      ) : task.leadId ? (
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
      {editing && (
        <MobileTaskSheet
          task={task}
          onClose={() => setEditing(false)}
          onCreated={() => {
            setEditing(false)
            toast.show('Tarefa salva')
          }}
        />
      )}
      {toast.node}
    </div>
  )
}
