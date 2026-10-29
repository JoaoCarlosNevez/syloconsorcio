// Cards do "Engajamento operacional" do Perfil a partir dos números da API
// (GET /dashboard/me/engagement — últimos 30 dias do usuário). O
// Administrativo tem os cards dele (cotas efetivadas, checklist, parcelas e
// tarefas).

import type { BackofficeEngagement, MyEngagement, SellerEngagement } from './dashboard-api'

export interface EngagementCard {
  label: string
  value: string
  sub: string
  /** Destaque verde (alta em relação ao período anterior, cliente abriu…). */
  positive: boolean
}

function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString('pt-BR')} ${count === 1 ? one : many}`
}

function formatMoneyShort(cents: number): string {
  const reais = cents / 100
  if (reais >= 1_000_000) {
    return `R$ ${(reais / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  }
  if (reais >= 10_000) return `R$ ${Math.round(reais / 1000).toLocaleString('pt-BR')} mil`
  return reais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

/** "↑ 25% vs 30 dias anteriores" — sem base anterior, não inventa percentual. */
export function comparison(
  current: number,
  previous: number,
  emptyText = 'Nenhum lead nos últimos 30 dias',
): { text: string; positive: boolean } {
  if (previous === 0) {
    return current > 0
      ? { text: 'Sem registro nos 30 dias anteriores', positive: true }
      : { text: emptyText, positive: false }
  }
  const change = Math.round(((current - previous) / previous) * 100)
  if (change === 0) return { text: 'Igual aos 30 dias anteriores', positive: false }
  const arrow = change > 0 ? '↑' : '↓'
  return { text: `${arrow} ${Math.abs(change)}% vs 30 dias anteriores`, positive: change > 0 }
}

export function engagementCards(e: MyEngagement): EngagementCard[] {
  return e.kind === 'backoffice' ? backofficeCards(e) : sellerCards(e)
}

function backofficeCards(e: BackofficeEngagement): EngagementCard[] {
  const effective = comparison(
    e.quotasEffective,
    e.quotasEffectivePrevious,
    'Nenhuma cota efetivada no período',
  )
  const payments = e.paymentsPaid + e.paymentsLate
  return [
    {
      label: 'Cotas\nEfetivadas',
      value: e.quotasEffective.toLocaleString('pt-BR'),
      sub: effective.text,
      positive: effective.positive,
    },
    {
      label: 'Itens de\nChecklist',
      value: e.checklistItems.toLocaleString('pt-BR'),
      sub:
        e.documents === 0
          ? 'Nenhum documento anexado'
          : `${plural(e.documents, 'documento anexado', 'documentos anexados')}`,
      positive: false,
    },
    {
      label: 'Parcelas\nConferidas',
      value: payments.toLocaleString('pt-BR'),
      sub:
        payments === 0
          ? 'Responda os "Confirmar pagamento"'
          : `${plural(e.paymentsPaid, 'paga', 'pagas')} · ${plural(e.paymentsLate, 'atrasada', 'atrasadas')}`,
      positive: payments > 0 && e.paymentsLate === 0,
    },
    {
      label: 'Tarefas\nConcluídas',
      value: e.tasksCompleted.toLocaleString('pt-BR'),
      sub: e.tasksCompleted === 0 ? 'Nenhuma tarefa concluída' : 'Nos últimos 30 dias',
      positive: e.tasksCompleted > 0,
    },
  ]
}

function sellerCards(e: SellerEngagement): EngagementCard[] {
  const leads = comparison(e.leadsWorked, e.leadsWorkedPrevious)
  return [
    {
      label: 'Leads\nAtendidos',
      value: e.leadsWorked.toLocaleString('pt-BR'),
      sub: leads.text,
      positive: leads.positive,
    },
    {
      label: 'Simulações',
      value: e.proposalsCreated.toLocaleString('pt-BR'),
      sub:
        e.proposalsCreated === 0
          ? 'Nenhuma proposta gerada'
          : `${plural(e.proposalsShared, 'enviada', 'enviadas')} ao cliente`,
      positive: false,
    },
    {
      label: 'Propostas\nEnviadas',
      value: e.proposalsShared.toLocaleString('pt-BR'),
      sub:
        e.proposalsShared === 0
          ? 'Envie o link da proposta pelo lead'
          : `${plural(e.proposalsOpened, 'aberta', 'abertas')} pelo cliente`,
      positive: e.proposalsOpened > 0,
    },
    {
      label: 'Cotas\nFechadas',
      value: e.wonCount.toLocaleString('pt-BR'),
      sub:
        e.wonCount === 0
          ? 'Nenhuma venda no período'
          : `${formatMoneyShort(e.wonValueCents)} em crédito`,
      positive: e.wonCount > 0,
    },
  ]
}
