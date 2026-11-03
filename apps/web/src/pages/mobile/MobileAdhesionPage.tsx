// Checklist de adesão no celular: o vendedor tira foto dos documentos (ou
// escolhe o arquivo) e vai preenchendo a ficha item por item — cada item é
// salvo assim que confirma. Mesmo checklist do web (aba Adesão do lead).

import { Skeleton } from '@sylocrm/ui'
import { type FormEvent, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMobileAdhesion } from '../../hooks/useMobileAdhesion'
import {
  ADHESION_DOCUMENTS,
  ADHESION_ITEMS,
  type AdhesionFieldKey,
  type AdhesionForm,
  type AdhesionSection,
  PAYMENT_METHOD_OPTIONS,
  QUOTA_ITEMS,
  type QuotaForm,
  adhesionText,
  formatZipCode,
  isFilled,
  isQuotaFilled,
  needsSpouse,
} from '../../lib/adhesion-checklist'
import { formatMoneyInput, formatPhoneBR } from '../../lib/lead-adapters'
import type { AdhesionDocumentKind } from '../../lib/leads-api'
import { lookupZipCode } from '../../lib/zip-code'
import styles from './Mobile.module.css'
import { BackBar, Sheet, useToast } from './MobileUi'
import { CameraIcon, ClipboardIcon, FileIcon, TickIcon } from './icons'

const FILE_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif'
const MAX_BYTES = 10 * 1024 * 1024

const MARITAL_STATUS_OPTIONS = [
  'Solteiro(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viúvo(a)',
  'União Estável',
]

const SECTIONS: { key: AdhesionSection; title: string }[] = [
  { key: 'pessoais', title: 'Dados pessoais' },
  { key: 'preferencias', title: 'Preferências' },
]

const MONEY_KEYS: ReadonlySet<string> = new Set(['assetValue', 'downPayment', 'income'])
const PHONE_KEYS: ReadonlySet<string> = new Set(['phone', 'phone2'])
const NUMBER_KEYS: ReadonlySet<string> = new Set([
  'zipCode',
  'prepaidInstallments',
  'installmentDueDay',
])

const PLACEHOLDER: Partial<Record<string, string>> = {
  birthplace: 'Cidade/UF',
  address: 'Rua, número, complemento, bairro, cidade/UF',
  zipCode: '00000-000',
  preferredAdministrator: 'Se o cliente preferir alguma',
  contactHours: 'Ex: dias úteis depois das 18h',
  administrator: 'Ex: Porto Seguro, Embracon…',
  assetCode: 'Código na tabela da administradora',
  planTable: 'Ex: Imóvel Plano Leve 200',
  groupCode: 'Ex: 1234',
  quotaNumber: 'Ex: 0123',
  prepaidInstallments: 'Quantidade',
  installmentDueDay: 'Ex: 10 (todo dia 10)',
}

type Target =
  | { kind: 'field'; key: AdhesionFieldKey; label: string }
  | { kind: 'quota'; index: number; key: keyof QuotaForm; label: string }
  | { kind: 'doc'; docKind: AdhesionDocumentKind }

/** Máscara de cada campo, igual ao web. */
function formatValue(key: string, raw: string): string {
  if (MONEY_KEYS.has(key)) return formatMoneyInput(raw)
  if (PHONE_KEYS.has(key)) return formatPhoneBR(raw)
  if (key === 'zipCode') return formatZipCode(raw)
  if (key === 'prepaidInstallments') return raw.replace(/\D/g, '').slice(0, 3)
  if (key === 'installmentDueDay') {
    const digits = raw.replace(/\D/g, '').slice(0, 2)
    return digits && Number(digits) > 31 ? '31' : digits
  }
  return raw
}

function inputModeFor(key: string): 'decimal' | 'tel' | 'numeric' | 'email' | 'text' {
  if (MONEY_KEYS.has(key)) return 'decimal'
  if (PHONE_KEYS.has(key)) return 'tel'
  if (NUMBER_KEYS.has(key)) return 'numeric'
  if (key === 'email') return 'email'
  return 'text'
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

function CheckMark({ done, required }: { done: boolean; required: boolean }) {
  return (
    <span
      className={`${styles.check} ${done ? styles.checkOn : ''} ${!done && !required ? styles.checkOptional : ''}`}
      aria-hidden="true"
    >
      {done ? <TickIcon /> : null}
    </span>
  )
}

export function MobileAdhesionPage() {
  const { id = '' } = useParams()
  const a = useMobileAdhesion(id)
  const toast = useToast()
  const [target, setTarget] = useState<Target | null>(null)
  const [draft, setDraft] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const cameraInput = useRef<HTMLInputElement | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)

  if (a.isLoading) {
    return (
      <main className={styles.content}>
        <BackBar fallback={`/m/leads/${id}`} />
        <Skeleton width="100%" height={96} />
        <Skeleton width="100%" height={200} />
        <Skeleton width="100%" height={260} />
      </main>
    )
  }

  const form = a.form
  const progress = a.progress
  if (!form || !progress || !a.card) {
    return (
      <main className={styles.content}>
        <BackBar fallback={`/m/leads/${id}`} />
        <p className={styles.empty}>Não deu pra abrir a ficha de adesão deste lead.</p>
      </main>
    )
  }

  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0
  const several = form.quotas.length > 1

  function openField(next: Target) {
    setConfirmRemove(false)
    if (next.kind === 'field') setDraft(form?.[next.key] ?? '')
    else if (next.kind === 'quota') setDraft(form?.quotas[next.index]?.[next.key] ?? '')
    setTarget(next)
  }

  /** Aplica o valor no formulário (+ endereço pelo CEP) e salva. */
  async function commit(value: string) {
    if (!form || !target || target.kind === 'doc') return
    let next: AdhesionForm
    if (target.kind === 'field') {
      next = { ...form, [target.key]: value }
      if (
        target.key === 'zipCode' &&
        value.replace(/\D/g, '').length === 8 &&
        !form.address.trim()
      ) {
        try {
          const address = await lookupZipCode(value)
          if (address) next = { ...next, address }
        } catch (error) {
          toast.show(error instanceof Error ? `CEP: ${error.message}` : 'Não deu pra buscar o CEP')
        }
      }
    } else {
      const { index, key } = target
      next = {
        ...form,
        quotas: form.quotas.map((q, i) => (i === index ? { ...q, [key]: value } : q)),
      }
    }
    try {
      await a.save(next)
      setTarget(null)
      toast.show('Salvo')
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Não deu pra salvar. Tente de novo.')
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void commit(draft.trim())
  }

  async function onFile(kind: AdhesionDocumentKind, file: File | undefined) {
    if (!file) return
    if (file.size > MAX_BYTES) {
      toast.show('Arquivo grande demais — envie até 10 MB.')
      return
    }
    try {
      await a.uploadDocument(kind, file)
      setTarget(null)
      toast.show('Documento anexado')
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Não deu pra anexar. Tente de novo.')
    }
  }

  async function onRemove(documentId: string) {
    try {
      await a.removeDocument(documentId)
      setTarget(null)
      toast.show('Documento removido')
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Não deu pra remover.')
    }
  }

  async function onCopy() {
    if (!form) return
    const sellerName = form.sellerUserId ? a.memberName(form.sellerUserId) : null
    try {
      await navigator.clipboard.writeText(
        adhesionText(form, { organizationName: a.organizationName, sellerName }),
      )
      toast.show('Ficha copiada — cole no portal da administradora')
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Não deu pra copiar')
    }
  }

  function fieldRow(key: AdhesionFieldKey, label: string, required: boolean) {
    if (!form) return null
    const done = isFilled(form, key)
    const shown = key === 'sellerUserId' ? (a.memberName(form[key]) ?? '') : form[key]
    return (
      <button
        key={key}
        type="button"
        className={styles.row}
        onClick={() => openField({ kind: 'field', key, label })}
      >
        <CheckMark done={done} required={required} />
        <span className={styles.grow}>
          <span className={styles.rowTitle}>{label}</span>
          <span className={`${styles.rowSub} ${!done && required ? styles.rowMissing : ''}`}>
            {done ? shown : required ? 'Falta preencher' : 'Opcional'}
          </span>
        </span>
      </button>
    )
  }

  // ── Folha de edição ──
  const editingKey = target && target.kind !== 'doc' ? target.key : null
  const options: readonly string[] | null =
    editingKey === 'maritalStatus'
      ? MARITAL_STATUS_OPTIONS
      : editingKey === 'paymentMethod'
        ? PAYMENT_METHOD_OPTIONS
        : null

  const docTarget = target?.kind === 'doc' ? target : null
  const docDefinition = docTarget
    ? ADHESION_DOCUMENTS.find((d) => d.kind === docTarget.docKind)
    : undefined
  const currentDoc = docTarget ? a.documents.find((d) => d.kind === docTarget.docKind) : undefined
  const isUploading = docTarget !== null && a.uploadingKind === docTarget.docKind

  return (
    <main className={styles.content}>
      <BackBar fallback={`/m/leads/${id}`} />

      <section className={`${styles.card} ${styles.goalCard}`}>
        <p className={styles.eyebrow}>Checklist de adesão</p>
        <div className={styles.goalHead}>
          <span className={styles.rowTitle}>{a.card.name}</span>
          <strong>{percent}%</strong>
        </div>
        <div className={styles.goalTrack}>
          <div className={styles.goalFill} style={{ width: `${percent}%` }} />
        </div>
        <p className={styles.note}>
          {progress.missing.length === 0
            ? 'Tudo pronto pra fazer a adesão.'
            : `${progress.done} de ${progress.total} itens. Faltam: ${progress.missing.slice(0, 3).join(', ')}${progress.missing.length > 3 ? ` e mais ${progress.missing.length - 3}` : ''}.`}
        </p>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Documentos</h2>
        <div className={`${styles.card} ${styles.list}`}>
          {a.documentsLoading ? (
            <div className={styles.row}>
              <Skeleton width="100%" height={36} />
            </div>
          ) : (
            ADHESION_DOCUMENTS.map((doc) => {
              const current = a.documents.find((d) => d.kind === doc.kind)
              return (
                <button
                  key={doc.kind}
                  type="button"
                  className={styles.row}
                  onClick={() => {
                    setConfirmRemove(false)
                    setTarget({ kind: 'doc', docKind: doc.kind })
                  }}
                >
                  <CheckMark done={Boolean(current)} required={doc.required} />
                  <span className={styles.grow}>
                    <span className={styles.rowTitle}>{doc.label}</span>
                    <span
                      className={`${styles.rowSub} ${!current && doc.required ? styles.rowMissing : ''}`}
                    >
                      {current
                        ? `${current.fileName} · ${formatSize(current.sizeBytes)}`
                        : doc.required
                          ? 'Toque pra tirar a foto'
                          : 'Opcional'}
                    </span>
                  </span>
                  <CameraIcon />
                </button>
              )
            })
          )}
        </div>
        <p className={styles.note}>
          PDF ou foto, até 10 MB. Arquivos privados — só quem vê o lead consegue abrir.
        </p>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Venda</h2>
        <div className={`${styles.card} ${styles.list}`}>
          {fieldRow('sellerUserId', 'Vendedor', true)}
        </div>
      </section>

      {form.quotas.map((quota, index) => (
        <section key={`quota-${index + 1}`}>
          <h2 className={styles.sectionTitle}>
            {several ? `Cota ${index + 1} de ${form.quotas.length}` : 'Dados do plano'}
          </h2>
          <div className={`${styles.card} ${styles.list}`}>
            {QUOTA_ITEMS.map((item) => {
              const done = isQuotaFilled(quota, item.key)
              return (
                <button
                  key={item.key}
                  type="button"
                  className={styles.row}
                  onClick={() =>
                    openField({ kind: 'quota', index, key: item.key, label: item.label })
                  }
                >
                  <CheckMark done={done} required={item.required} />
                  <span className={styles.grow}>
                    <span className={styles.rowTitle}>{item.label}</span>
                    <span
                      className={`${styles.rowSub} ${!done && item.required ? styles.rowMissing : ''}`}
                    >
                      {done ? quota[item.key] : item.required ? 'Falta preencher' : 'Opcional'}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {SECTIONS.map((section) => (
        <section key={section.key}>
          <h2 className={styles.sectionTitle}>{section.title}</h2>
          <div className={`${styles.card} ${styles.list}`}>
            {ADHESION_ITEMS.filter(
              (item) =>
                item.section === section.key &&
                (item.key !== 'spouseName' || needsSpouse(form.maritalStatus)),
            ).map((item) => fieldRow(item.key, item.label, item.required(form)))}
          </div>
        </section>
      ))}

      <button type="button" className={`${styles.btn} ${styles.btnLine}`} onClick={onCopy}>
        <ClipboardIcon />
        Copiar ficha pra administradora
      </button>
      {several || (
        <p className={styles.note}>Mais de uma cota na mesma venda? Adicione pelo computador.</p>
      )}

      {target && target.kind !== 'doc' && (
        <Sheet onClose={() => setTarget(null)}>
          <h3>{target.label}</h3>
          {target.kind === 'field' && target.key === 'sellerUserId' ? (
            <div className={styles.options}>
              {a.members.map((member) => (
                <button
                  key={member.userId}
                  type="button"
                  className={`${styles.option} ${member.userId === form.sellerUserId ? styles.optionOn : ''}`}
                  disabled={a.isSaving}
                  onClick={() => commit(member.userId)}
                >
                  {member.name ?? member.email}
                </button>
              ))}
            </div>
          ) : options ? (
            <div className={styles.options}>
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.option} ${option === draft ? styles.optionOn : ''}`}
                  disabled={a.isSaving}
                  onClick={() => commit(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <form className={styles.form} onSubmit={onSubmit}>
              {target.key === 'notes' ? (
                <textarea
                  className={`${styles.input} ${styles.textarea}`}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  aria-label={target.label}
                />
              ) : (
                <input
                  className={styles.input}
                  value={draft}
                  inputMode={inputModeFor(target.key)}
                  placeholder={PLACEHOLDER[target.key]}
                  onChange={(event) => setDraft(formatValue(target.key, event.target.value))}
                  aria-label={target.label}
                  // biome-ignore lint/a11y/noAutofocus: a folha abre pra digitar esse campo
                  autoFocus
                />
              )}
              {target.kind === 'field' && target.key === 'zipCode' && !form.address.trim() && (
                <p className={styles.note}>O endereço é preenchido pelo CEP.</p>
              )}
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={a.isSaving}
              >
                {a.isSaving ? 'Salvando…' : 'Salvar'}
              </button>
            </form>
          )}
        </Sheet>
      )}

      {docTarget && docDefinition && (
        <Sheet onClose={() => setTarget(null)}>
          <h3>{docDefinition.label}</h3>
          <p className={styles.note}>
            {currentDoc
              ? `Anexado: ${currentDoc.fileName} (${formatSize(currentDoc.sizeBytes)}). Enviar outro substitui.`
              : docDefinition.hint}
          </p>
          {confirmRemove && currentDoc ? (
            <div className={styles.two}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnLine}`}
                onClick={() => setConfirmRemove(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDanger}`}
                disabled={a.isRemoving}
                onClick={() => onRemove(currentDoc.id)}
              >
                {a.isRemoving ? 'Removendo…' : 'Remover'}
              </button>
            </div>
          ) : (
            <>
              <div className={styles.two}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={isUploading}
                  onClick={() => cameraInput.current?.click()}
                >
                  <CameraIcon />
                  {isUploading ? 'Enviando…' : 'Tirar foto'}
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnLine}`}
                  disabled={isUploading}
                  onClick={() => fileInput.current?.click()}
                >
                  <FileIcon />
                  Arquivo
                </button>
              </div>
              {currentDoc && (
                <div className={styles.two}>
                  {currentDoc.url ? (
                    <a
                      href={currentDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${styles.btn} ${styles.btnGhost}`}
                    >
                      Ver
                    </a>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    className={`${styles.link} ${styles.linkDanger}`}
                    onClick={() => setConfirmRemove(true)}
                  >
                    Remover
                  </button>
                </div>
              )}
            </>
          )}
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(event) => {
              void onFile(docTarget.docKind, event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <input
            ref={fileInput}
            type="file"
            accept={FILE_ACCEPT}
            hidden
            onChange={(event) => {
              void onFile(docTarget.docKind, event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </Sheet>
      )}

      {toast.node}
    </main>
  )
}
