// Configuração visual e tipos do Kanban — não contém mais dados de leads.
// Os leads vêm da API real (ver apps/web/src/hooks/useLeads.ts e
// apps/web/src/lib/lead-adapters.ts). Importado por KanbanPage, LeadModal e
// HomePage para manter cores/labels de coluna consistentes em toda a UI.

// ── Tipos ─────────────────────────────────────────────────────────────────────

import type { LeadStage } from '../lib/leads-api'

export interface CardData {
  id: string
  name: string
  phone: string
  cota: string
  date: string
  assignedUserId: string | null
  stage: LeadStage
  tags: string[]
  source: string
  sourceBg: string
  sourceText: string
  days: string
  daysUrgent: boolean
}

export interface ColumnMeta {
  id: string
  name: string
  headerBg: string
  headerBorder: string
  headerText: string
  countText: string
}

// Tier do usuário autenticado — fonte única de verdade para toda a UI
export const USER_TIER = 'diamante' as const

// ── Metadados das colunas ─────────────────────────────────────────────────────

export const COLUMN_META: ColumnMeta[] = [
  {
    id: 'lead',
    name: 'Lead',
    headerBg: 'rgba(226,232,240,0.7)',
    headerBorder: 'rgba(203,213,225,0.5)',
    headerText: '#1e293b',
    countText: '#334155',
  },
  {
    id: 'atendimento',
    name: 'Em Atendimento',
    headerBg: 'rgba(254,243,199,0.7)',
    headerBorder: '#fde68a',
    headerText: '#451a03',
    countText: '#92400e',
  },
  {
    id: 'simulacao',
    name: 'Simulação',
    headerBg: 'rgba(237,233,254,0.7)',
    headerBorder: '#ddd6fe',
    headerText: '#2e1065',
    countText: '#5b21b6',
  },
  {
    id: 'proposta',
    name: 'Proposta',
    headerBg: 'rgba(255,228,230,0.7)',
    headerBorder: '#fecdd3',
    headerText: '#4c0519',
    countText: '#9f1239',
  },
  {
    id: 'fechado',
    name: 'Fechado',
    headerBg: 'rgba(224,242,254,0.7)',
    headerBorder: '#bae6fd',
    headerText: '#082f49',
    countText: '#075985',
  },
  {
    id: 'venda',
    name: 'Venda Concluída',
    headerBg: 'rgba(209,250,229,0.7)',
    headerBorder: '#a7f3d0',
    headerText: '#022c22',
    countText: '#065f46',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extrai segmento e valor da string de cota. Ex: 'Cota R$ 350.000 (Imobiliário)' */
export function parseCotaFields(cota: string): { segmento: string; valor: string } {
  const typeMatch = cota.match(/\((.+)\)/)
  const valueMatch = cota.match(/R\$\s*[\d.,]+/)
  return {
    segmento: typeMatch?.[1] ?? cota,
    valor: valueMatch?.[0] ?? '',
  }
}

// ── Mapeamentos por coluna ────────────────────────────────────────────────────

/** Status que aparece no badge da tabela de tarefas da HomePage */
export const COLUMN_STATUS_LABEL: Record<string, 'Atendimento' | 'Simulação' | 'Proposta'> = {
  lead: 'Atendimento',
  atendimento: 'Atendimento',
  simulacao: 'Simulação',
  proposta: 'Proposta',
  fechado: 'Proposta',
}

/** Próxima ação esperada para cada etapa do funil */
export const COLUMN_TAREFA_LABEL: Record<string, string> = {
  lead: 'Primeiro Contato',
  atendimento: 'Follow-Up',
  simulacao: 'Enviar Simulação',
  proposta: 'Negociar Proposta',
  fechado: 'Formalização',
}
