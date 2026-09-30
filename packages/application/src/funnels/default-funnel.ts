// Funil com que toda organização nasce — sem ao menos um funil o Kanban não
// tem colunas e não dá pra criar lead. Mesmas etapas/cores do backfill que
// criou o "Padrão" das organizações antigas (backfill-funnels.ts). "Ganho" não
// é etapa: é o wonAt do lead.

import type { NewFunnelStageInput } from '../ports/funnel.repository'

export const DEFAULT_FUNNEL_NAME = 'Padrão'

export const DEFAULT_FUNNEL_STAGES: readonly NewFunnelStageInput[] = [
  { name: 'Lead', color: '#94a3b8' },
  { name: 'Em Atendimento', color: '#f59e0b' },
  { name: 'Simulação', color: '#8b5cf6' },
  { name: 'Proposta', color: '#f43f5e' },
  { name: 'Fechado', color: '#0ea5e9' },
]
