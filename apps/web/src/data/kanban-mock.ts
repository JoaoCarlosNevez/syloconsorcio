// Configuração visual e tipos do Kanban — não contém mais dados de leads.
// Os leads vêm da API real (ver apps/web/src/hooks/useLeads.ts e
// apps/web/src/lib/lead-adapters.ts). Colunas do board vêm dos estágios do
// funil ativo (ver apps/web/src/hooks/useFunnels.ts e
// apps/web/src/lib/stage-colors.ts) — não são mais uma lista fixa aqui.

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface CardData {
  id: string
  name: string
  phone: string
  email: string | null
  segment: string
  quotaCount: number
  cota: string
  valueCents: number
  date: string
  /** ISO 8601 — usado no feed de histórico (evento "Lead criado"). */
  createdAt: string
  assignedUserId: string | null
  funnelId: string
  stageId: string
  /** Não-null quando o lead está marcado como Perdido — ver resolveCardOutcome. */
  lostAt: string | null
  /** Motivo da perda, quando perdido. */
  lostReason: string | null
  /** Não-null quando o lead está marcado como Ganho — ver resolveCardOutcome. */
  wonAt: string | null
  tags: string[]
  notes: string | null
  /** Dados de qualificação usados pela simulação de crédito — null até o
   * vendedor preencher a ficha (ver Simulações no LeadModal). */
  profession: string | null
  incomeCents: number | null
  maritalStatus: string | null
  cpf: string | null
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
