// Tests: describeActivity — frases do log de atividades.

import { describe, expect, it } from 'vitest'
import type { ActivityEntry } from './activity-api'
import { activityActorName, activityDayLabel, describeActivity } from './activity-format'

function entry(overrides: Partial<ActivityEntry>): ActivityEntry {
  return {
    id: 'act-01',
    organizationId: 'org-01',
    actor: { id: 'user-01', name: 'Ana', email: 'ana@empresa.com', avatarUrl: null },
    action: 'lead.created',
    entityType: 'lead',
    entityId: 'lead-01',
    entityLabel: 'Maria',
    metadata: {},
    createdAt: '2026-09-25T12:00:00.000Z',
    ...overrides,
  }
}

const memberName = (id: string | null) => (id === 'user-02' ? 'Bruno' : 'ninguém')

describe('describeActivity', () => {
  it('describes a stage change with both stages', () => {
    const text = describeActivity(
      entry({
        action: 'lead.stage_changed',
        metadata: { fromStage: 'Contato', toStage: 'Proposta' },
      }),
      memberName,
    )
    expect(text).toBe('moveu o lead “Maria” de “Contato” para “Proposta”')
  })

  it('resolves member names for reassignment', () => {
    const text = describeActivity(
      entry({ action: 'lead.assigned', metadata: { fromUserId: null, toUserId: 'user-02' } }),
      memberName,
    )
    expect(text).toBe('transferiu o lead “Maria” de ninguém para Bruno')
  })

  it('describes the automatic handoff copy and credits the system', () => {
    const e = entry({
      action: 'lead.duplicated',
      actor: null,
      metadata: { toFunnelName: 'Pós-venda', automatic: true },
    })
    expect(activityActorName(e)).toBe('Sistema')
    expect(describeActivity(e, memberName)).toBe(
      'copiou o lead “Maria” para o funil “Pós-venda” (passar o bastão)',
    )
  })

  it('lists edited fields in Portuguese', () => {
    const text = describeActivity(
      entry({ action: 'lead.updated', metadata: { fields: ['valueCents', 'phone'] } }),
      memberName,
    )
    expect(text).toBe('editou o lead “Maria” (valor, telefone)')
  })

  it('uses the team list for member events without a label', () => {
    const text = describeActivity(
      entry({
        action: 'team.goal_updated',
        entityType: 'team',
        entityId: 'user-02',
        entityLabel: null,
        metadata: { salesGoalCents: null },
      }),
      memberName,
    )
    expect(text).toBe('removeu a meta de Bruno')
  })

  it('describes a tier change with the tier label', () => {
    const text = describeActivity(
      entry({
        action: 'team.tier_updated',
        entityType: 'team',
        entityId: 'user-02',
        entityLabel: null,
        metadata: { tier: 'ouro' },
      }),
      memberName,
    )
    expect(text).toBe('definiu a patente de Bruno como Ouro')
  })
})

describe('describeActivity — simulações', () => {
  it('mentions the table name when the simulation has one', () => {
    const text = describeActivity(
      entry({
        action: 'lead.proposal_created',
        entityType: 'lead',
        entityId: 'lead-01',
        entityLabel: 'Maria',
        metadata: { downPaymentCents: 5_000_00, termMonths: 24, tableName: 'Tabela Imóvel 2026' },
      }),
      memberName,
    )
    expect(text).toContain('na tabela “Tabela Imóvel 2026”')
  })
})

describe('activityDayLabel', () => {
  it('labels today and yesterday', () => {
    const now = new Date(2026, 8, 25, 15, 0)
    expect(activityDayLabel(new Date(2026, 8, 25, 9, 0).toISOString(), now)).toBe('Hoje')
    expect(activityDayLabel(new Date(2026, 8, 24, 23, 0).toISOString(), now)).toBe('Ontem')
  })
})
