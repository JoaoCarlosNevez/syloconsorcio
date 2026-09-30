// Parcelas da proposta — o vendedor informa o valor em faixas: "da 1ª até a
// Xª parcela R$ A, as demais R$ B" (quantas faixas quiser). No formulário cada
// faixa guarda só "até qual parcela" e o valor; a faixa começa logo depois da
// anterior e a última sempre vai até o fim do prazo ("as demais").
//
// O backend revalida a sequência (CreateLeadProposalUseCase).

import { parseValueToCents } from './lead-adapters'
import type { ProposalInstallmentRange } from './leads-api'

export interface InstallmentRow {
  /** "Até a parcela" — ignorado na última faixa, que vai até o fim do prazo. */
  until: string
  /** Valor com a máscara de dinheiro (formatMoneyInput). */
  amount: string
}

export const EMPTY_INSTALLMENT_ROW: InstallmentRow = { until: '', amount: '' }

/** Número da primeira parcela de cada faixa, na mesma ordem das linhas. */
export function installmentRowStarts(rows: InstallmentRow[]): number[] {
  const starts: number[] = []
  let next = 1
  for (const row of rows) {
    starts.push(next)
    const until = Number.parseInt(row.until, 10)
    next = Number.isNaN(until) ? next + 1 : until + 1
  }
  return starts
}

export type InstallmentRangesResult =
  | { ok: true; ranges: ProposalInstallmentRange[] }
  | { ok: false; error: string }

export function buildInstallmentRanges(
  rows: InstallmentRow[],
  termMonths: number,
): InstallmentRangesResult {
  if (rows.length === 0) return { ok: false, error: 'Informe o valor das parcelas.' }

  const ranges: ProposalInstallmentRange[] = []
  let from = 1
  for (const [index, row] of rows.entries()) {
    const isLast = index === rows.length - 1
    const to = isLast ? termMonths : Number.parseInt(row.until, 10)
    if (Number.isNaN(to) || to < from || (!isLast && to >= termMonths)) {
      return {
        ok: false,
        error: `A ${index + 1}ª faixa precisa ir da ${from}ª até uma parcela antes da ${termMonths}ª.`,
      }
    }
    const amountCents = parseValueToCents(row.amount)
    if (amountCents === null) {
      return { ok: false, error: 'Informe o valor de todas as faixas de parcelas.' }
    }
    ranges.push({ from, to, amountCents })
    from = to + 1
  }
  return { ok: true, ranges }
}

/** "R$ 1.500,00" — sempre com centavos (parcela não é arredondada). */
export function formatCurrency(cents: number): string {
  // Troca o espaço não separável do Intl por um comum — o jsPDF mede o NBSP
  // com outra largura e desalinha o texto alinhado à direita.
  return (cents / 100)
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    .replace(/\u00a0/g, ' ')
}

/** "1ª a 12ª" ou só "13ª" quando a faixa tem uma parcela. */
export function formatInstallmentRange(range: ProposalInstallmentRange): string {
  return range.from === range.to ? `${range.from}ª` : `${range.from}ª a ${range.to}ª`
}

/** Resumo de uma linha: "1ª a 12ª: R$ 1.500,00 · 13ª a 60ª: R$ 1.200,00". */
export function describeInstallments(ranges: ProposalInstallmentRange[]): string {
  return ranges
    .map((range) => `${formatInstallmentRange(range)}: ${formatCurrency(range.amountCents)}`)
    .join(' · ')
}

/** Soma de todas as parcelas (sem a entrada). */
export function totalInstallmentsCents(ranges: ProposalInstallmentRange[]): number {
  return ranges.reduce((sum, range) => sum + (range.to - range.from + 1) * range.amountCents, 0)
}
