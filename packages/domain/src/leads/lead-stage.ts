// LeadStage — etapa do funil de vendas em que um lead se encontra.
//
// Corresponde às colunas fixas do Kanban (ver apps/web/src/data/kanban-mock.ts).
// A ordem abaixo reflete a progressão esperada do funil, embora o backend
// não impose transições — qualquer stage pode mudar para qualquer outro.

export const LeadStage = {
  LEAD: 'LEAD',
  ATENDIMENTO: 'ATENDIMENTO',
  SIMULACAO: 'SIMULACAO',
  PROPOSTA: 'PROPOSTA',
  FECHADO: 'FECHADO',
  VENDA: 'VENDA',
} as const

export type LeadStage = (typeof LeadStage)[keyof typeof LeadStage]
