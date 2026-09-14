// Adapters — convertem Lead (formato da API) em CardData (formato que o
// Kanban/HomePage/LeadModal já sabem renderizar), para não precisar tocar
// nesses componentes ao trocar a fonte de dados de mock para API real.

import type { CardData } from '../data/kanban-mock'
import type { Lead, LeadStage } from './leads-api'

export const STAGE_TO_COLUMN_ID: Record<LeadStage, string> = {
  LEAD: 'lead',
  ATENDIMENTO: 'atendimento',
  SIMULACAO: 'simulacao',
  PROPOSTA: 'proposta',
  FECHADO: 'fechado',
  VENDA: 'venda',
}

export const COLUMN_ID_TO_STAGE: Record<string, LeadStage> = Object.fromEntries(
  Object.entries(STAGE_TO_COLUMN_ID).map(([stage, columnId]) => [columnId, stage as LeadStage]),
)

// Heurística de urgência: um lead que ainda não chegou em Simulação e está
// parado há muito tempo provavelmente perdeu o timing. Etapas mais avançadas
// não são marcadas como urgentes por dias-no-funil — precisam de um
// indicador próprio (SLA por etapa) quando esse dado existir.
const URGENT_STAGES: ReadonlySet<LeadStage> = new Set(['LEAD', 'ATENDIMENTO'])
const URGENT_AFTER_DAYS = 60

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  FACEBOOK: { bg: '#2563eb', text: '#fff' },
  INSTAGRAM: { bg: '#7c3aed', text: '#fff' },
  INDICAÇÃO: { bg: '#059669', text: '#fff' },
  SITE: { bg: '#334155', text: '#fff' },
}
const DEFAULT_SOURCE_COLOR = { bg: '#475569', text: '#fff' }

function getSourceColors(source: string): { bg: string; text: string } {
  return SOURCE_COLORS[source.toUpperCase()] ?? DEFAULT_SOURCE_COLOR
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0 })
}

export function formatCota(valueCents: number, segment: string, quotaCount: number): string {
  const prefix = quotaCount > 1 ? `${quotaCount} Cotas` : 'Cota'
  return `${prefix} R$ ${formatBRL(valueCents)} (${segment})`
}

export function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function toCardData(lead: Lead): CardData {
  const colors = getSourceColors(lead.source)
  const days = daysSince(lead.createdAt)

  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    cota: formatCota(lead.valueCents, lead.segment, lead.quotaCount),
    date: formatDate(lead.createdAt),
    // TODO: resolver nome real via um futuro endpoint de usuários da organização.
    // getAgentProfile (kanban-mock.ts) ainda ignora este valor e sempre mostra
    // o usuário placeholder — mantido assim até essa API existir.
    agent: lead.assignedUserId ?? 'Não atribuído',
    source: lead.source,
    sourceBg: colors.bg,
    sourceText: colors.text,
    days: `${days}d`,
    daysUrgent: URGENT_STAGES.has(lead.stage) && days > URGENT_AFTER_DAYS,
  }
}

/** Agrupa leads por coluna do Kanban — todas as 6 colunas sempre presentes, mesmo vazias. */
export function groupLeadsByColumn(leads: Lead[]): Record<string, CardData[]> {
  const board: Record<string, CardData[]> = {}
  for (const columnId of Object.values(STAGE_TO_COLUMN_ID)) {
    board[columnId] = []
  }
  for (const lead of leads) {
    const columnId = STAGE_TO_COLUMN_ID[lead.stage]
    board[columnId]?.push(toCardData(lead))
  }
  return board
}
