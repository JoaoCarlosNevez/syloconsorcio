import { describe, expect, it } from 'vitest'
import {
  type MobileTaskForm,
  canEditTask,
  mobileTaskChanges,
  mobileTaskPayload,
  taskToForm,
  toDatetimeLocalValue,
} from './mobile-task'
import type { Task } from './tasks-api'

const FORM: MobileTaskForm = {
  title: ' Ligar pra Maria ',
  type: 'Ligação',
  leadId: 'lead-1',
  assignee: 'me',
  noDueAt: false,
  dueAt: '2026-11-26T10:00',
  notes: ' ',
}

describe('mobileTaskPayload', () => {
  it('builds the payload for the creator when they cannot assign', () => {
    expect(mobileTaskPayload(FORM, false)).toEqual({
      ok: true,
      payload: {
        title: 'Ligar pra Maria',
        type: 'Ligação',
        leadId: 'lead-1',
        dueAt: new Date('2026-11-26T10:00').toISOString(),
        notes: null,
      },
    })
  })

  it('sends the person or the sector queue when they can assign', () => {
    const toPerson = mobileTaskPayload({ ...FORM, assignee: 'ana' }, true)
    expect(toPerson.ok && toPerson.payload.assignedUserId).toBe('ana')
    const toQueue = mobileTaskPayload({ ...FORM, assignee: 'sector:adm' }, true)
    expect(toQueue.ok && toQueue.payload).toMatchObject({
      assignedSector: 'adm',
      assignedUserId: null,
    })
  })

  it('allows no due date and refuses an empty title or date', () => {
    const noDue = mobileTaskPayload({ ...FORM, noDueAt: true, dueAt: '' }, false)
    expect(noDue.ok && noDue.payload.dueAt).toBeNull()
    expect(mobileTaskPayload({ ...FORM, title: '  ' }, false).ok).toBe(false)
    expect(mobileTaskPayload({ ...FORM, dueAt: '' }, false).ok).toBe(false)
  })
})

describe('toDatetimeLocalValue', () => {
  it('formats the local date and time', () => {
    expect(toDatetimeLocalValue(new Date(2026, 10, 5, 9, 7))).toBe('2026-11-05T09:07')
  })
})

const TASK: Task = {
  id: 'task-1',
  organizationId: 'org',
  leadId: 'lead-1',
  assignedUserId: 'me',
  assignedSector: null,
  createdByUserId: 'me',
  type: 'Ligação',
  title: 'Ligar pra Maria',
  notes: null,
  status: 'pendente',
  dueAt: '2026-11-26T13:00:00.000Z',
  completedAt: null,
  createdAt: '2026-11-25T12:00:00.000Z',
  updatedAt: '2026-11-25T12:00:00.000Z',
}

describe('mobileTaskChanges', () => {
  it('saves the edited fields without touching the assignee for a seller', () => {
    const form = { ...taskToForm(TASK), title: 'Retornar pra Maria', type: 'Visita' as const }
    const result = mobileTaskChanges(form, false, TASK)
    expect(result).toEqual({
      ok: true,
      payload: {
        title: 'Retornar pra Maria',
        type: 'Visita',
        leadId: 'lead-1',
        dueAt: '2026-11-26T13:00:00.000Z',
        notes: null,
      },
    })
  })

  it('reassigns only to another person and only with task.assign', () => {
    const toAna = mobileTaskChanges({ ...taskToForm(TASK), assignee: 'ana' }, true, TASK)
    expect(toAna.ok && toAna.payload.assignedUserId).toBe('ana')
    const same = mobileTaskChanges(taskToForm(TASK), true, TASK)
    expect(same.ok && 'assignedUserId' in same.payload).toBe(false)
    const queue = mobileTaskChanges({ ...taskToForm(TASK), assignee: 'sector:adm' }, true, TASK)
    expect(queue.ok && 'assignedUserId' in queue.payload).toBe(false)
  })

  it('can remove the due date', () => {
    const result = mobileTaskChanges({ ...taskToForm(TASK), noDueAt: true }, false, TASK)
    expect(result.ok && result.payload.dueAt).toBeNull()
  })
})

describe('canEditTask', () => {
  it('lets the seller edit their own tasks', () => {
    expect(canEditTask(TASK, 'me', false)).toBe(true)
    expect(
      canEditTask({ ...TASK, assignedUserId: 'ana', createdByUserId: 'me' }, 'me', false),
    ).toBe(true)
    expect(
      canEditTask({ ...TASK, assignedUserId: null, createdByUserId: 'ana' }, 'me', false),
    ).toBe(false)
    expect(
      canEditTask({ ...TASK, assignedUserId: 'ana', createdByUserId: 'ana' }, 'me', true),
    ).toBe(true)
  })
})
