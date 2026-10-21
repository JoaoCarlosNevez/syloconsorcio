// LeadAttachments — aba "Anexos" do lead: só os documentos que já foram
// anexados (o checklist, com o que falta, fica na aba Adesão).

import { Skeleton } from '@sylocrm/ui'
import { useAdhesionDocumentsQuery } from '../../hooks/useLeads'
import { ADHESION_DOCUMENTS } from '../../lib/adhesion-checklist'
import styles from './AdhesionTab.module.css'

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function FileIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

export function LeadAttachments({
  organizationId,
  leadId,
}: {
  organizationId: string | null
  leadId: string
}) {
  const { data, isLoading } = useAdhesionDocumentsQuery(organizationId, leadId)

  if (isLoading) {
    return (
      <div className={styles.documents}>
        <Skeleton width="100%" height={56} />
        <Skeleton width="100%" height={56} />
      </div>
    )
  }

  const documents = data?.documents ?? []
  if (documents.length === 0) {
    return (
      <p className={styles.attachmentsEmpty}>
        Nenhum documento anexado ainda. Os documentos da ficha são anexados pela aba Adesão.
      </p>
    )
  }

  // Na ordem do checklist (identidade, e-mail, comprovante, carta).
  const order = ADHESION_DOCUMENTS.map((doc) => doc.kind)
  const sorted = [...documents].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))

  return (
    <div className={styles.documents}>
      {sorted.map((document) => (
        <div key={document.id} className={styles.documentRow}>
          <span className={styles.attachmentIcon}>
            <FileIcon />
          </span>
          <div className={styles.documentInfo}>
            <span className={styles.documentLabel}>
              {ADHESION_DOCUMENTS.find((doc) => doc.kind === document.kind)?.label ?? 'Documento'}
            </span>
            <span className={styles.documentFile}>
              <span className={styles.documentName}>{document.fileName}</span>
              <span className={styles.documentSize}>
                {formatSize(document.sizeBytes)} · {formatDate(document.createdAt)}
              </span>
            </span>
          </div>
          {document.url && (
            <a
              className={styles.uploadBtn}
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
