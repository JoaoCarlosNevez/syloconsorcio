// ChatTaskModal — "Pedir tarefa" dentro de uma conversa: o que precisa ser
// feito, pra quem (uma pessoa ou a fila de um setor) e, se quiser, um prazo.
// Pedidos do chat costumam ser checagens e pendências, então o padrão é sem
// prazo.

import { Button, Modal, useToast } from '@sylocrm/ui'
import { type FormEvent, useState } from 'react'
import { useCreateChatTask } from '../../hooks/useChat'
import { SECTORS, SECTOR_LABEL, isSector } from '../../lib/sectors'
import type { TeamMember } from '../../lib/team-api'
import styles from './ChatThread.module.css'

export interface ChatTaskModalProps {
  organizationId: string
  conversationId: string
  members: TeamMember[]
  currentUserId?: string
  onClose: () => void
}

export function ChatTaskModal({
  organizationId,
  conversationId,
  members,
  currentUserId,
  onClose,
}: ChatTaskModalProps) {
  const { toast } = useToast()
  const createTask = useCreateChatTask(organizationId, conversationId)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  // "sector:adm" ou o id de uma pessoa.
  const [assignee, setAssignee] = useState('sector:adm')
  const [withDue, setWithDue] = useState(false)
  const [dueAt, setDueAt] = useState('')
  const [error, setError] = useState('')

  const people = members.filter((member) => member.userId !== currentUserId)

  function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Diga o que precisa ser feito.')
      return
    }
    let dueIso: string | null = null
    if (withDue) {
      const date = new Date(dueAt)
      if (!dueAt || Number.isNaN(date.getTime())) {
        setError('Informe o prazo ou desmarque "Com prazo".')
        return
      }
      dueIso = date.toISOString()
    }
    const sector = assignee.startsWith('sector:') ? assignee.slice('sector:'.length) : null
    createTask.mutate(
      {
        title: title.trim(),
        notes: notes.trim() || null,
        ...(isSector(sector) ? { assignedSector: sector } : { assignedUserId: assignee }),
        dueAt: dueIso,
      },
      {
        onSuccess: () => {
          toast({ type: 'success', title: 'Tarefa pedida' })
          onClose()
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Não foi possível criar.'),
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Pedir tarefa"
      size="sm"
      footer={
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" form="chat-task-form" loading={createTask.isPending}>
            Pedir
          </Button>
        </div>
      }
    >
      <form id="chat-task-form" className={styles.form} onSubmit={submit}>
        <label className={styles.field}>
          O que precisa ser feito
          <input
            className={styles.fieldInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Conferir o RG do cliente"
            // biome-ignore lint/a11y/noAutofocus: o modal abre pra digitar o pedido
            autoFocus
          />
        </label>

        <label className={styles.field}>
          Pra quem
          <select
            className={styles.fieldInput}
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <optgroup label="Setor (quem pegar primeiro)">
              {SECTORS.map((sector) => (
                <option key={sector} value={`sector:${sector}`}>
                  {SECTOR_LABEL[sector]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Pessoa">
              {people.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name ?? member.email}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className={styles.field}>
          Detalhes
          <textarea
            className={styles.fieldInput}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opcional"
          />
        </label>

        <label className={styles.check}>
          <input type="checkbox" checked={withDue} onChange={(e) => setWithDue(e.target.checked)} />
          Com prazo
        </label>
        {withDue && (
          <input
            className={styles.fieldInput}
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            aria-label="Prazo"
          />
        )}

        {error && <span className={styles.formError}>{error}</span>}
      </form>
    </Modal>
  )
}
