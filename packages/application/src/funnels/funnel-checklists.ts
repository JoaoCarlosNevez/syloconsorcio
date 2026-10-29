// Checklists dos funis fixos — marcados dentro do card (aba Checklist).
// O Comercial usa a ficha de adesão (lib/adhesion-checklist.ts no front).
//
// Marcar um item pode mover o card pra frente (`moveTo`, nunca pra trás) — a
// mudança de etapa vai pro histórico e conta nas conquistas do vendedor
// ("1ª parcela paga" → Em dia → Primeira assembleia; "Contemplado" →
// Primeira contemplação). No ADM, o Ganho (Efetivado) só sai com todos os
// itens marcados.

import type { FunnelKind } from '../ports/funnel.repository'

export interface ChecklistItemDefinition {
  key: string
  label: string
  /** Etapa pra onde o card vai ao marcar (se ainda estiver antes dela). */
  moveTo?: string
}

export const FUNNEL_CHECKLISTS: Partial<Record<FunnelKind, readonly ChecklistItemDefinition[]>> = {
  BACKOFFICE: [
    { key: 'docs_checked', label: 'Documentos conferidos', moveTo: 'Checado' },
    {
      key: 'proposal_typed',
      label: 'Proposta digitada na administradora',
      moveTo: 'Enviado',
    },
    { key: 'first_boleto_sent', label: 'Boleto da 1ª parcela enviado ao cliente' },
    { key: 'quota_effective', label: 'Grupo e cota informados (efetivada)', moveTo: 'Efetivado' },
  ],
  POST_SALE: [
    { key: 'welcome_done', label: 'Boas-vindas feitas', moveTo: 'Aguardando 1º boleto' },
    { key: 'first_installment_paid', label: '1ª parcela paga', moveTo: 'Em dia' },
    { key: 'first_assembly', label: 'Participou da 1ª assembleia' },
    { key: 'second_installment_paid', label: '2ª parcela paga' },
    { key: 'third_installment_paid', label: '3ª parcela paga' },
    { key: 'contemplated', label: 'Contemplado', moveTo: 'Contemplado' },
  ],
}

/** Itens do Pós-venda que valem como "cota nas assembleias" / contemplação
 * pras conquistas do Mural. */
export const ASSEMBLY_CHECKLIST_KEYS = ['first_installment_paid', 'first_assembly'] as const
export const CONTEMPLATION_CHECKLIST_KEYS = ['contemplated'] as const

// "Atrasado" não é destino de nenhum item: é a etapa movida à mão quando o
// cliente não paga.

export function checklistFor(kind: FunnelKind): readonly ChecklistItemDefinition[] {
  return FUNNEL_CHECKLISTS[kind] ?? []
}
