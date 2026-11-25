// Nova tarefa e edição de tarefa pelo celular — mesmas regras do formulário
// do web (TaskFormModal): título obrigatório, prazo ou "sem prazo", e
// responsável só pra quem tem task.assign (pessoa ou a fila de um setor).

import { type Sector, isSector } from './sectors'
import type { CreateTaskPayload, Task, TaskType, UpdateTaskPayload } from './tasks-api'

export interface MobileTaskForm {
  title: string
  type: TaskType
  leadId: string | null
  /** id de uma pessoa ou "sector:<setor>" (fila do setor). */
  assignee: string
  noDueAt: boolean
  /** Valor do <input type="datetime-local">. */
  dueAt: string
  notes: string
}

export type MobileTaskResult =
  | { ok: true; payload: CreateTaskPayload }
  | { ok: false; error: string }

/** Date → "2026-11-25T10:00" (horário local, formato do datetime-local). */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function sectorAssignee(sector: Sector): string {
  return `sector:${sector}`
}

/** Formulário preenchido com a tarefa, pra editar. */
export function taskToForm(task: Task): MobileTaskForm {
  return {
    title: task.title,
    type: task.type,
    leadId: task.leadId,
    assignee:
      task.assignedUserId ?? (task.assignedSector ? sectorAssignee(task.assignedSector) : ''),
    noDueAt: task.dueAt === null,
    dueAt: toDatetimeLocalValue(task.dueAt ? new Date(task.dueAt) : new Date()),
    notes: task.notes ?? '',
  }
}

function dueAtIso(form: MobileTaskForm): { ok: true; value: string | null } | { ok: false } {
  if (form.noDueAt) return { ok: true, value: null }
  const date = new Date(form.dueAt)
  if (!form.dueAt || Number.isNaN(date.getTime())) return { ok: false }
  return { ok: true, value: date.toISOString() }
}

const DUE_AT_ERROR = 'Escolha data e horário ou marque "Sem prazo".'

/** Mudanças pra salvar numa tarefa existente. Responsável só muda pra outra
 * pessoa, e só com task.assign — a fila do setor não se escolhe de novo. */
export function mobileTaskChanges(
  form: MobileTaskForm,
  canAssign: boolean,
  task: Task,
): { ok: true; payload: UpdateTaskPayload } | { ok: false; error: string } {
  if (!form.title.trim()) return { ok: false, error: 'Dê um título pra tarefa.' }
  const due = dueAtIso(form)
  if (!due.ok) return { ok: false, error: DUE_AT_ERROR }
  const toPerson = !form.assignee.startsWith('sector:') && form.assignee !== ''
  const reassign = canAssign && toPerson && form.assignee !== task.assignedUserId
  return {
    ok: true,
    payload: {
      title: form.title.trim(),
      type: form.type,
      leadId: form.leadId,
      ...(reassign ? { assignedUserId: form.assignee } : {}),
      dueAt: due.value,
      notes: form.notes.trim() || null,
    },
  }
}

export function mobileTaskPayload(form: MobileTaskForm, canAssign: boolean): MobileTaskResult {
  if (!form.title.trim()) return { ok: false, error: 'Dê um título pra tarefa.' }
  const due = dueAtIso(form)
  if (!due.ok) return { ok: false, error: DUE_AT_ERROR }
  // Sem task.assign nem manda o responsável: a API deixa com quem criou.
  const sector = form.assignee.startsWith('sector:') ? form.assignee.slice('sector:'.length) : null
  const assignment = !canAssign
    ? {}
    : isSector(sector)
      ? { assignedSector: sector, assignedUserId: null }
      : { assignedUserId: form.assignee }
  return {
    ok: true,
    payload: {
      title: form.title.trim(),
      type: form.type,
      leadId: form.leadId,
      ...assignment,
      dueAt: due.value,
      notes: form.notes.trim() || null,
    },
  }
}

/** Pode editar no celular: tarefa dela, que ela criou, ou quem distribui. */
export function canEditTask(task: Task, userId: string | null, canAssign: boolean): boolean {
  if (canAssign) return true
  if (!userId) return false
  return task.assignedUserId === userId || task.createdByUserId === userId
}
