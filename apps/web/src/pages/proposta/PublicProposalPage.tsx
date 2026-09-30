// PublicProposalPage — /p/:token, a proposta que o vendedor manda pro cliente
// por link. Pública (sem login); abrir a página avisa o vendedor no sininho
// (ver ViewSharedProposalUseCase). Layout simples por enquanto.

import { Skeleton, useToast } from '@sylocrm/ui'
import { useParams } from 'react-router-dom'
import { usePublicProposalQuery } from '../../hooks/usePublicProposal'
import { formatCota } from '../../lib/lead-adapters'
import type { PublicProposal } from '../../lib/leads-api'
import {
  formatCurrency,
  formatInstallmentRange,
  totalInstallmentsCents,
} from '../../lib/proposal-installments'
import { downloadProposalPdf } from '../../lib/proposal-pdf'
import styles from './PublicProposalPage.module.css'

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function ProposalSkeleton() {
  return (
    <div className={styles.card}>
      <Skeleton width="45%" height={24} />
      <Skeleton width="30%" height={14} />
      <div className={styles.grid}>
        {['a', 'b', 'c', 'd'].map((key) => (
          <Skeleton key={key} width="80%" height={36} />
        ))}
      </div>
      <Skeleton width="100%" height={90} />
    </div>
  )
}

function ProposalContent({ proposal }: { proposal: PublicProposal }) {
  const createdAt = new Date(proposal.createdAt)
  const cota = formatCota(proposal.valueCents, proposal.segment, proposal.quotaCount)
  const { toast } = useToast()

  function handleDownload() {
    void downloadProposalPdf({
      organizationName: proposal.organization.name,
      consultantName: proposal.consultantName,
      client: { name: proposal.client.name },
      cota,
      valueCents: proposal.valueCents,
      tableName: proposal.tableName,
      downPaymentCents: proposal.downPaymentCents,
      termMonths: proposal.termMonths,
      installments: proposal.installments,
      createdAt,
    }).catch((error: unknown) => {
      toast({
        type: 'error',
        title: 'Não foi possível gerar o PDF',
        description: error instanceof Error ? error.message : undefined,
      })
    })
  }

  const fields: [string, string][] = [
    ['Cota', cota],
    ['Valor da cota', formatCurrency(proposal.valueCents)],
    ['Entrada', formatCurrency(proposal.downPaymentCents)],
    ['Prazo', `${proposal.termMonths} meses`],
  ]
  if (proposal.tableName) fields.unshift(['Tabela', proposal.tableName])

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <div className={styles.brand}>
          {proposal.organization.iconUrl && (
            <img className={styles.logo} src={proposal.organization.iconUrl} alt="" />
          )}
          <span className={styles.orgName}>{proposal.organization.name}</span>
        </div>
        <span className={styles.date}>{createdAt.toLocaleDateString('pt-BR')}</span>
      </header>

      <div>
        <h1 className={styles.title}>Proposta de Consórcio</h1>
        <p className={styles.subtitle}>
          Preparada para <strong>{proposal.client.name}</strong>
        </p>
      </div>

      <dl className={styles.grid}>
        {fields.map(([label, value]) => (
          <div key={label} className={styles.field}>
            <dt className={styles.label}>{label}</dt>
            <dd className={styles.value}>{value}</dd>
          </div>
        ))}
      </dl>

      {proposal.installments && proposal.installments.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Parcelas</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Parcelas</th>
                <th>Quantidade</th>
                <th className={styles.right}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {proposal.installments.map((range) => (
                <tr key={range.from}>
                  <td>{formatInstallmentRange(range)}</td>
                  <td>{range.to - range.from + 1}x</td>
                  <td className={styles.right}>{formatCurrency(range.amountCents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Total em parcelas</td>
                <td className={styles.right}>
                  {formatCurrency(totalInstallmentsCents(proposal.installments))}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      <footer className={styles.footer}>
        <div className={styles.footerText}>
          {proposal.consultantName && <span>Consultor responsável: {proposal.consultantName}</span>}
          <span>Proposta pré-aprovada, sujeita à confirmação da administradora do consórcio.</span>
        </div>
        <button type="button" className={styles.downloadBtn} onClick={handleDownload}>
          <DownloadIcon />
          Baixar PDF
        </button>
      </footer>
    </div>
  )
}

export function PublicProposalPage() {
  const { token = '' } = useParams<{ token: string }>()
  const { data, isLoading, isError } = usePublicProposalQuery(token)

  return (
    <main className={styles.page}>
      {isLoading ? (
        <ProposalSkeleton />
      ) : isError || !data ? (
        <div className={`${styles.card} ${styles.notFound}`}>
          <h1 className={styles.title}>Proposta não encontrada</h1>
          <p className={styles.subtitle}>
            O link pode estar incompleto. Peça um novo link ao seu consultor.
          </p>
        </div>
      ) : (
        <ProposalContent proposal={data} />
      )}
    </main>
  )
}
