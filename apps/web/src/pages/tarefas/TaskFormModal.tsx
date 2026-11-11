// TaskFormModal — formulário de criar/editar tarefa, compartilhado entre
// TarefasPage (tarefa avulsa ou ligada a um lead escolhido numa lista) e o
// card de Tarefas do LeadModal (sempre ligada ao lead aberto, sem seletor).

import { useState } from 'react'
import { SECTORS, SECTOR_LABEL, isSector } from '../../lib/sectors'
import type { CreateTaskPayload, Task, TaskType, UpdateTaskPayload } from '../../lib/tasks-api'
import type { TeamMember } from '../../lib/team-api'
import styles from './TarefasPage.module.css'
import { TASK_TYPES } from './tarefas.types'

function XIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultDueAt(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
  d.setMinutes(0, 0, 0)
  return toDatetimeLocalValue(d.toISOString())
}

export interface TaskLeadOption {
  id: string
  label: string
}

export interface TaskFormModalProps {
  mode: 'create' | 'edit'
  initialTask?: Task
  /** Quando presente, o lead já está fixado (aberto a partir do LeadModal) —
   * some o seletor de lead. */
  fixedLeadId?: string | null
  fixedLeadLabel?: string
  leadOptions: TaskLeadOption[]
  members: TeamMember[]
  currentUserId: string
  /** Sem task.assign (Vendedor), o seletor de Responsável nem aparece — toda
   * tarefa criada/editada por ele fica (ou continua) atribuída a ele mesmo. */
  canAssign: boolean
  onClose: () => void
  onSubmit: (data: CreateTaskPayload | UpdateTaskPayload) => void
  isSubmitting?: boolean
}

export function TaskFormModal({
  mode,
  initialTask,
  fixedLeadId,
  fixedLeadLabel,
  leadOptions,
  members,
  currentUserId,
  canAssign,
  onClose,
  onSubmit,
  isSubmitting = false,
}: TaskFormModalProps) {
  const [title, setTitle] = useState(initialTask?.title ?? '')
  const [type, setType] = useState<TaskType>(initialTask?.type ?? 'Ligação')
  const [leadId, setLeadId] = useState(fixedLeadId ?? initialTask?.leadId ?? '')
  // Responsável: id de uma pessoa ou "sector:<setor>" (fila do setor).
  const [assignee, setAssignee] = useState(
    initialTask
      ? (initialTask.assignedUserId ??
          (initialTask.assignedSector ? `sector:${initialTask.assignedSector}` : currentUserId))
      : currentUserId,
  )
  const initialAssignee = initialTask?.assignedUserId ?? null
  const [noDueAt, setNoDueAt] = useState(initialTask ? initialTask.dueAt === null : false)
  const [dueAt, setDueAt] = useState(
    initialTask?.dueAt ? toDatetimeLocalValue(initialTask.dueAt) : defaultDueAt(),
  )
  const [notes, setNotes] = useState(initialTask?.notes ?? '')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Título é obrigatório.')
      return
    }
    let dueAtIso: string | null = null
    if (!noDueAt) {
      if (!dueAt) {
        setError('Informe data e horário ou marque "Sem prazo".')
        return
      }
      dueAtIso = new Date(dueAt).toISOString()
      if (Number.isNaN(new Date(dueAtIso).getTime())) {
        setError('Data e horário inválidos.')
        return
      }
    }
    const sector = assignee.startsWith('sector:') ? assignee.slice('sector:'.length) : null
    // Sem task.assign, nem manda o campo — o backend também ignoraria e
    // forçaria pra quem criou, mas evita a UI sugerir algo que não vale. Ao
    // editar, só manda se mudou pra uma pessoa (a fila não se escolhe de novo).
    const assignment = !canAssign
      ? {}
      : mode === 'create'
        ? isSector(sector)
          ? { assignedSector: sector, assignedUserId: null }
          : { assignedUserId: assignee }
        : !sector && assignee !== initialAssignee
          ? { assignedUserId: assignee }
          : {}
    onSubmit({
      title: title.trim(),
      type,
      leadId: fixedLeadId !== undefined ? fixedLeadId : leadId || null,
      ...assignment,
      dueAt: dueAtIso,
      notes: notes.trim() || null,
    })
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop dismiss
    <div className={styles.ntOverlay} onClick={onClose}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal stops propagation */}
      <div className={styles.ntModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.ntHeader}>
          <span className={styles.ntTitle}>
            {mode === 'create' ? 'Nova atividade' : 'Editar atividade'}
          </span>
          <button type="button" className={styles.ntCloseBtn} onClick={onClose} aria-label="Fechar">
            <XIcon />
          </button>
        </div>

        <form className={styles.ntForm} onSubmit={handleSubmit}>
          <label className={styles.ntLabel}>
            Título
            <input
              className={styles.ntInput}
              type="text"
              placeholder="Ex: Ligar para João Silva"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className={styles.ntLabel}>
            Tipo
            <select
              className={styles.ntSelect}
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.ntLabel}>
            <label htmlFor="task-form-lead">Lead / Cliente</label>
            {fixedLeadId !== undefined ? (
              <input
                id="task-form-lead"
                className={styles.ntInput}
                type="text"
                value={fixedLeadLabel ?? '—'}
                disabled
              />
            ) : (
              <select
                id="task-form-lead"
                className={styles.ntSelect}
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
              >
                <option value="">Nenhum (tarefa avulsa)</option>
                {leadOptions.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {canAssign && (
            <label className={styles.ntLabel}>
              Responsável
              <select
                className={styles.ntSelect}
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <optgroup label="Pessoa">
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.userId === currentUserId ? 'Você' : (member.name ?? member.email)}
                    </option>
                  ))}
                </optgroup>
                {(mode === 'create' || assignee.startsWith('sector:')) && (
                  <optgroup label="Setor (quem pegar primeiro)">
                    {SECTORS.map((sector) => (
                      <option
                        key={sector}
                        value={`sector:${sector}`}
                        disabled={mode === 'edit' && assignee !== `sector:${sector}`}
                      >
                        Fila {SECTOR_LABEL[sector]}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
          )}

          <div className={styles.ntLabel}>
            <label htmlFor="task-form-due">Data &amp; Horário</label>
            <input
              id="task-form-due"
              className={styles.ntInput}
              type="datetime-local"
              value={dueAt}
              disabled={noDueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
            <label className={styles.ntCheck}>
              <input
                type="checkbox"
                checked={noDueAt}
                onChange={(e) => setNoDueAt(e.target.checked)}
              />
              Sem prazo
            </label>
          </div>

          <label className={styles.ntLabel}>
            Observações
            <textarea
              className={styles.ntInput}
              rows={3}
              placeholder="Opcional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          {error && <span className={styles.ntError}>{error}</span>}

          <div className={styles.ntActions}>
            <button type="button" className={styles.ntCancelBtn} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.ntSubmitBtn} disabled={isSubmitting}>
              {isSubmitting
                ? 'Salvando…'
                : mode === 'create'
                  ? 'Criar atividade'
                  : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
