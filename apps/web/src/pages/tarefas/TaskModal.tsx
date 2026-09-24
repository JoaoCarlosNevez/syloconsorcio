// TaskModal — ficha de detalhe de uma tarefa, abre ao clicar em qualquer linha
// da TarefasPage (ou do card de Tarefas do LeadModal).

import { useEffect, useState } from 'react'
import { resolveAgent } from '../../lib/lead-adapters'
import type { Task } from '../../lib/tasks-api'
import type { TeamMember } from '../../lib/team-api'
import styles from './TaskModal.module.css'
import { STATUS_CFG, TYPE_BADGES, displayStatus, formatTaskDateTime } from './tarefas.types'

// ── Ícones ─────────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      width="12"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function CalIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

// ── Props ───────────────────────────────────────────────────────────────────────

interface TaskModalProps {
  task: Task
  leadName?: string
  members: TeamMember[]
  onClose: () => void
  onConcluir?: () => void
  onExcluir?: () => void
  onEdit?: () => void
  onSaveNotes?: (notes: string | null) => void
}

// ── Component ───────────────────────────────────────────────────────────────────

export function TaskModal({
  task,
  leadName,
  members,
  onClose,
  onConcluir,
  onExcluir,
  onEdit,
  onSaveNotes,
}: TaskModalProps) {
  const statusCfg = STATUS_CFG[displayStatus(task)]
  const badge = TYPE_BADGES[task.type]
  const responsible = resolveAgent(task.assignedUserId, members)

  const [editingNotes, setEditingNotes] = useState(false)
  const [notesDraft, setNotesDraft] = useState(task.notes ?? '')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSaveNotes() {
    onSaveNotes?.(notesDraft.trim() || null)
    setEditingNotes(false)
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop dismiss
    <div className={styles.overlay} onClick={onClose}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal stops propagation */}
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.identityArea}>
              <div className={styles.breadcrumb}>
                <span className={styles.breadcrumbLink}>Tarefas</span>
                <span className={styles.breadcrumbSep}>
                  <ChevronRightIcon />
                </span>
                <span className={styles.breadcrumbLink}>{task.type}</span>
              </div>

              <div className={styles.titleRow}>
                <h2 className={styles.taskName}>{task.title}</h2>
                <span
                  className={styles.statusBadge}
                  style={{ background: statusCfg.bg, borderColor: statusCfg.border }}
                >
                  <span className={styles.statusDot} style={{ background: statusCfg.dot }} />
                  <span style={{ color: statusCfg.color }}>{statusCfg.label}</span>
                </span>
              </div>

              <div className={styles.metaStrip}>
                <span className={styles.metaItem}>
                  <span className={styles.metaIcon}>
                    <PersonIcon />
                  </span>
                  {leadName ?? 'Sem lead vinculado'}
                </span>
                <span className={styles.metaDot}>·</span>
                <span className={styles.metaItem}>
                  <span className={styles.metaIcon}>
                    <ClockIcon />
                  </span>
                  {formatTaskDateTime(task.dueAt)}
                </span>
              </div>
            </div>

            <div className={styles.headerActions}>
              {task.status !== 'concluida' && (
                <button type="button" className={styles.btnConcluir} onClick={onConcluir}>
                  <CheckIcon />
                  Concluir
                </button>
              )}
              <button type="button" className={styles.btnSecondary} onClick={onEdit}>
                <PencilIcon />
                Editar
              </button>
              <button type="button" className={styles.btnDanger} onClick={onExcluir}>
                <TrashIcon />
                Excluir
              </button>
              <span className={styles.headerDivider} />
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Fechar"
              >
                <XIcon />
              </button>
            </div>
          </div>
        </div>

        {/* ── Workspace ───────────────────────────────────────────────────── */}
        <div className={styles.workspace}>
          <div className={styles.leftCol}>
            <div className={styles.card}>
              <div className={styles.cardTitleRow}>
                <span className={styles.cardTitle}>Detalhes da atividade</span>
              </div>

              <div className={styles.attrsGrid}>
                <div className={styles.attrCell}>
                  <span className={styles.attrLabel}>
                    <TagIcon /> Tipo
                  </span>
                  <span
                    className={styles.typeBadge}
                    style={{ background: badge.bg, borderColor: badge.border, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </div>

                <div className={styles.attrCell}>
                  <span className={styles.attrLabel}>
                    <PersonIcon /> Lead / Cliente
                  </span>
                  <span className={styles.attrValue}>{leadName ?? '—'}</span>
                </div>

                <div className={styles.attrCell}>
                  <span className={styles.attrLabel}>
                    <CalIcon /> Data &amp; Horário
                  </span>
                  <span className={styles.attrValue}>{formatTaskDateTime(task.dueAt)}</span>
                </div>

                <div className={styles.attrCell}>
                  <span className={styles.attrLabel}>
                    <ClockIcon /> Status
                  </span>
                  <span
                    className={styles.statusPill}
                    style={{ background: statusCfg.bg, borderColor: statusCfg.border }}
                  >
                    <span className={styles.statusDot} style={{ background: statusCfg.dot }} />
                    <span style={{ color: statusCfg.color }}>{statusCfg.label}</span>
                  </span>
                </div>

                <div className={styles.attrCell}>
                  <span className={styles.attrLabel}>
                    <PersonIcon /> Responsável
                  </span>
                  <span className={styles.attrValue}>{responsible.name}</span>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardTitleRow}>
                <span className={styles.cardTitle}>Observações</span>
                {!editingNotes && (
                  <button
                    type="button"
                    className={styles.editBtn}
                    onClick={() => setEditingNotes(true)}
                  >
                    <PencilIcon /> Editar
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    className={styles.obsBox}
                    style={{ width: '100%', minHeight: 80, resize: 'vertical' }}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => {
                        setNotesDraft(task.notes ?? '')
                        setEditingNotes(false)
                      }}
                    >
                      Cancelar
                    </button>
                    <button type="button" className={styles.editBtn} onClick={handleSaveNotes}>
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.obsBox}>
                  <p className={styles.obsText}>
                    {task.notes?.trim() || 'Nenhuma observação registrada.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className={styles.rightCol}>
            <div className={styles.historyCard}>
              <div className={styles.historyHeader}>
                <span className={styles.historyTitle}>Informações</span>
              </div>
              <div className={styles.timeline}>
                <div className={styles.timelineEvent}>
                  <div className={styles.timelineLeft}>
                    <div className={`${styles.timelineIcon} ${styles.timelineIconSystem}`}>
                      <ClockIcon />
                    </div>
                    <div className={styles.timelineConnector} />
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineRow}>
                      <span className={styles.timelineTitle}>Criada em</span>
                      <span className={styles.timelineDate}>
                        {formatTaskDateTime(task.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.timelineEvent}>
                  <div className={styles.timelineLeft}>
                    <div className={`${styles.timelineIcon} ${styles.timelineIconSystem}`}>
                      <PencilIcon />
                    </div>
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineRow}>
                      <span className={styles.timelineTitle}>Última atualização</span>
                      <span className={styles.timelineDate}>
                        {formatTaskDateTime(task.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
