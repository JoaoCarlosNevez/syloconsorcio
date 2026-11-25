import { describe, expect, it } from 'vitest'
import { type MobileTaskForm, mobileTaskPayload, toDatetimeLocalValue } from './mobile-task'

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
