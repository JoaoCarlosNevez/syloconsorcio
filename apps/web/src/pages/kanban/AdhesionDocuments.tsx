// AdhesionDocuments — anexos da ficha de adesão: print do e-mail, comprovante
// de residência e carta a punho (opcional). Um arquivo por tipo: enviar outro
// substitui. Os arquivos ficam num bucket privado; o "Ver" abre um link
// temporário gerado pela API.

import { Skeleton, useToast } from '@sylocrm/ui'
import { useRef, useState } from 'react'
import {
  useAdhesionDocumentsQuery,
  useDeleteAdhesionDocument,
  useUploadAdhesionDocument,
} from '../../hooks/useLeads'
import { ADHESION_DOCUMENTS } from '../../lib/adhesion-checklist'
import type { AdhesionDocumentKind } from '../../lib/leads-api'
import styles from './AdhesionTab.module.css'

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif'
const MAX_BYTES = 10 * 1024 * 1024

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

function FileIcon() {
  return (
    <svg
      width="16"
      height="16"
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

function UploadIcon() {
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
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

export function AdhesionDocuments({
  organizationId,
  leadId,
}: {
  organizationId: string | null
  leadId: string
}) {
  const { data, isLoading } = useAdhesionDocumentsQuery(organizationId, leadId)
  const upload = useUploadAdhesionDocument(organizationId, leadId)
  const remove = useDeleteAdhesionDocument(organizationId, leadId)
  const { toast } = useToast()
  const inputs = useRef<Partial<Record<AdhesionDocumentKind, HTMLInputElement | null>>>({})
  const [uploadingKind, setUploadingKind] = useState<AdhesionDocumentKind | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  async function handleFile(kind: AdhesionDocumentKind, file: File | undefined) {
    if (!file) return
    if (file.size > MAX_BYTES) {
      toast({ type: 'warning', title: 'Arquivo grande demais', description: 'Envie até 10 MB.' })
      return
    }
    setUploadingKind(kind)
    try {
      await upload.mutateAsync({ kind, file })
      toast({ type: 'success', title: 'Documento anexado' })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível anexar',
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setUploadingKind(null)
    }
  }

  async function handleDelete(documentId: string) {
    try {
      await remove.mutateAsync(documentId)
      setConfirmingId(null)
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível remover',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  if (isLoading) {
    return (
      <div className={styles.documents}>
        {ADHESION_DOCUMENTS.map((doc) => (
          <Skeleton key={doc.kind} width="100%" height={56} />
        ))}
      </div>
    )
  }

  const documents = data?.documents ?? []

  return (
    <div className={styles.documents}>
      {ADHESION_DOCUMENTS.map((doc) => {
        const current = documents.find((d) => d.kind === doc.kind)
        const isUploading = uploadingKind === doc.kind
        return (
          <div key={doc.kind} className={styles.documentRow}>
            <span
              className={
                current
                  ? styles.checkDone
                  : doc.required
                    ? styles.checkMissing
                    : styles.checkOptional
              }
              aria-hidden="true"
            >
              {current && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <div className={styles.documentInfo}>
              <span className={styles.documentLabel}>
                {doc.label}
                {!doc.required && <span className={styles.optional}>(opcional)</span>}
              </span>
              {current ? (
                <span className={styles.documentFile}>
                  <FileIcon />
                  <span className={styles.documentName}>{current.fileName}</span>
                  <span className={styles.documentSize}>{formatSize(current.sizeBytes)}</span>
                </span>
              ) : (
                <span className={styles.documentHint}>{doc.hint}</span>
              )}
            </div>
            <div className={styles.documentActions}>
              {current && confirmingId === current.id ? (
                <>
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => setConfirmingId(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.dangerBtn}
                    onClick={() => handleDelete(current.id)}
                    disabled={remove.isPending}
                  >
                    {remove.isPending ? 'Removendo…' : 'Remover'}
                  </button>
                </>
              ) : (
                <>
                  {current?.url && (
                    <a
                      className={styles.linkBtn}
                      href={current.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver
                    </a>
                  )}
                  {current && (
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => setConfirmingId(current.id)}
                    >
                      Remover
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    onClick={() => inputs.current[doc.kind]?.click()}
                    disabled={isUploading}
                  >
                    <UploadIcon />
                    {isUploading ? 'Enviando…' : current ? 'Trocar' : 'Anexar'}
                  </button>
                </>
              )}
              <input
                ref={(el) => {
                  inputs.current[doc.kind] = el
                }}
                type="file"
                accept={ACCEPT}
                hidden
                onChange={(e) => {
                  void handleFile(doc.kind, e.target.files?.[0])
                  // Permite escolher o mesmo arquivo de novo depois.
                  e.target.value = ''
                }}
              />
            </div>
          </div>
        )
      })}
      <p className={styles.documentNote}>
        PDF ou foto, até 10 MB. Arquivos privados — só quem vê o lead consegue abrir.
      </p>
    </div>
  )
}
