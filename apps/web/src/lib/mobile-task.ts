// Nova tarefa pelo celular — mesmas regras do formulário do web
// (TaskFormModal): título obrigatório, prazo ou "sem prazo", e responsável só
// pra quem tem task.assign (pessoa ou a fila de um setor).

import { type Sector, isSector } from './sectors'
import type { CreateTaskPayload, TaskType } from './tasks-api'

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

export function mobileTaskPayload(form: MobileTaskForm, canAssign: boolean): MobileTaskResult {
  if (!form.title.trim()) return { ok: false, error: 'Dê um título pra tarefa.' }
  let dueAt: string | null = null
  if (!form.noDueAt) {
    const date = new Date(form.dueAt)
    if (!form.dueAt || Number.isNaN(date.getTime())) {
      return { ok: false, error: 'Escolha data e horário ou marque "Sem prazo".' }
    }
    dueAt = date.toISOString()
  }
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
      dueAt,
      notes: form.notes.trim() || null,
    },
  }
}
