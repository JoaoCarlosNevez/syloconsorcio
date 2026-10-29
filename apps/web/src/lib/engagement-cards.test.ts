import { describe, expect, it } from 'vitest'
import type { BackofficeEngagement, SellerEngagement } from './dashboard-api'
import { comparison, engagementCards } from './engagement-cards'

const BASE: SellerEngagement = {
  kind: 'seller',
  periodStart: '',
  periodEnd: '',
  leadsWorked: 12,
  leadsWorkedPrevious: 8,
  proposalsCreated: 6,
  proposalsShared: 4,
  proposalsOpened: 3,
  wonCount: 2,
  wonValueCents: 350_000_00,
}

describe('comparison', () => {
  it('compares with the previous 30 days', () => {
    expect(comparison(12, 8)).toEqual({ text: '↑ 50% vs 30 dias anteriores', positive: true })
    expect(comparison(6, 8)).toEqual({ text: '↓ 25% vs 30 dias anteriores', positive: false })
    expect(comparison(8, 8).text).toBe('Igual aos 30 dias anteriores')
  })

  it('does not make up a percentage without a previous base', () => {
    expect(comparison(5, 0).text).toBe('Sem registro nos 30 dias anteriores')
    expect(comparison(0, 0).text).toBe('Nenhum lead nos últimos 30 dias')
  })
})

describe('engagementCards', () => {
  it('builds the four cards from the real numbers', () => {
    expect(engagementCards(BASE)).toEqual([
      {
        label: 'Leads\nAtendidos',
        value: '12',
        sub: '↑ 50% vs 30 dias anteriores',
        positive: true,
      },
      { label: 'Simulações', value: '6', sub: '4 enviadas ao cliente', positive: false },
      { label: 'Propostas\nEnviadas', value: '4', sub: '3 abertas pelo cliente', positive: true },
      { label: 'Cotas\nFechadas', value: '2', sub: 'R$ 350 mil em crédito', positive: true },
    ])
  })

  it('explains the empty states', () => {
    const cards = engagementCards({
      ...BASE,
      proposalsCreated: 0,
      proposalsShared: 0,
      proposalsOpened: 0,
      wonCount: 0,
      wonValueCents: 0,
    })
    expect(cards.map((c) => c.sub).slice(1)).toEqual([
      'Nenhuma proposta gerada',
      'Envie o link da proposta pelo lead',
      'Nenhuma venda no período',
    ])
  })
})

describe('engagementCards — Administrativo', () => {
  const WORK: BackofficeEngagement = {
    kind: 'backoffice',
    periodStart: '',
    periodEnd: '',
    quotasEffective: 6,
    quotasEffectivePrevious: 4,
    checklistItems: 31,
    documents: 1,
    paymentsPaid: 5,
    paymentsLate: 2,
    tasksCompleted: 0,
  }

  it('shows the back-office work instead of sales', () => {
    expect(engagementCards(WORK).map((c) => [c.label, c.value, c.sub])).toEqual([
      ['Cotas\nEfetivadas', '6', '↑ 50% vs 30 dias anteriores'],
      ['Itens de\nChecklist', '31', '1 documento anexado'],
      ['Parcelas\nConferidas', '7', '5 pagas · 2 atrasadas'],
      ['Tarefas\nConcluídas', '0', 'Nenhuma tarefa concluída'],
    ])
  })
})
