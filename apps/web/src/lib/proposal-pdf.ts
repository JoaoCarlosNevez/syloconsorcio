// PDF da proposta aprovada — layout simples (cabeçalho, cliente, proposta,
// tabela de parcelas), gerado no navegador com jsPDF e baixado na hora.
// jsPDF é importado sob demanda pra não pesar no bundle principal.

import type { ProposalInstallmentRange } from './leads-api'
import {
  formatCurrency,
  formatInstallmentRange,
  totalInstallmentsCents,
} from './proposal-installments'

export interface ProposalPdfData {
  organizationName: string
  consultantName: string | null
  client: {
    name: string
    cpf: string | null
    phone: string
    email: string | null
  }
  cota: string
  valueCents: number
  tableName: string | null
  downPaymentCents: number
  termMonths: number
  installments: ProposalInstallmentRange[] | null
  createdAt: Date
}

const MARGIN = 20
const PAGE_WIDTH = 210
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const INK = '#0b1c30'
const MUTED = '#64748b'
const RULE = '#e2e8f0'

/** Nome do arquivo: "proposta-maria-silva-2026-09-30.pdf". */
export function proposalPdfFileName(clientName: string, createdAt: Date): string {
  const slug = clientName
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const date = createdAt.toISOString().slice(0, 10)
  return `proposta-${slug || 'cliente'}-${date}.pdf`
}

export async function downloadProposalPdf(data: ProposalPdfData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  // ── Cabeçalho ────────────────────────────────────────────────────────────
  doc.setTextColor(INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Proposta de Consórcio', MARGIN, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(MUTED)
  doc.text(data.organizationName, PAGE_WIDTH - MARGIN, y, { align: 'right' })
  doc.text(data.createdAt.toLocaleDateString('pt-BR'), PAGE_WIDTH - MARGIN, y + 5, {
    align: 'right',
  })
  y += 12
  doc.setDrawColor(RULE)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 10

  function section(title: string) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(INK)
    doc.text(title.toUpperCase(), MARGIN, y)
    y += 7
  }

  /** Pares rótulo/valor em duas colunas. */
  function fields(pairs: [string, string][]) {
    const colWidth = CONTENT_WIDTH / 2
    pairs.forEach(([label, value], index) => {
      const x = MARGIN + (index % 2) * colWidth
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(MUTED)
      doc.text(label, x, y)
      doc.setFontSize(11)
      doc.setTextColor(INK)
      doc.text(value, x, y + 5, { maxWidth: colWidth - 4 })
      if (index % 2 === 1 || index === pairs.length - 1) y += 13
    })
    y += 3
  }

  // ── Cliente ──────────────────────────────────────────────────────────────
  section('Cliente')
  fields([
    ['Nome', data.client.name],
    ['CPF', data.client.cpf ?? '—'],
    ['Telefone', data.client.phone || '—'],
    ['E-mail', data.client.email ?? '—'],
  ])

  // ── Proposta ─────────────────────────────────────────────────────────────
  section('Proposta')
  const proposalFields: [string, string][] = [
    ['Cota', data.cota],
    ['Valor da cota', formatCurrency(data.valueCents)],
    ['Entrada', formatCurrency(data.downPaymentCents)],
    ['Prazo', `${data.termMonths} meses`],
  ]
  if (data.tableName) proposalFields.unshift(['Tabela', data.tableName])
  fields(proposalFields)

  // ── Parcelas ─────────────────────────────────────────────────────────────
  if (data.installments?.length) {
    section('Parcelas')
    const cols = [MARGIN, MARGIN + 60, MARGIN + 110]
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(MUTED)
    doc.text('Parcelas', cols[0] as number, y)
    doc.text('Quantidade', cols[1] as number, y)
    doc.text('Valor da parcela', PAGE_WIDTH - MARGIN, y, { align: 'right' })
    y += 3
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(INK)
    for (const range of data.installments) {
      doc.text(formatInstallmentRange(range), cols[0] as number, y)
      doc.text(`${range.to - range.from + 1}x`, cols[1] as number, y)
      doc.text(formatCurrency(range.amountCents), PAGE_WIDTH - MARGIN, y, { align: 'right' })
      y += 7
    }
    doc.line(MARGIN, y - 3, PAGE_WIDTH - MARGIN, y - 3)
    y += 3
    doc.setFont('helvetica', 'bold')
    doc.text('Total em parcelas', cols[0] as number, y)
    doc.text(formatCurrency(totalInstallmentsCents(data.installments)), PAGE_WIDTH - MARGIN, y, {
      align: 'right',
    })
    y += 12
  }

  // ── Rodapé ───────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(MUTED)
  if (data.consultantName) {
    doc.text(`Consultor responsável: ${data.consultantName}`, MARGIN, y)
    y += 5
  }
  doc.text(
    'Proposta pré-aprovada, sujeita à confirmação da administradora do consórcio.',
    MARGIN,
    y,
  )

  doc.save(proposalPdfFileName(data.client.name, data.createdAt))
}
