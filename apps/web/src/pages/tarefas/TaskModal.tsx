// TaskModal — ficha de detalhe de uma tarefa, abre ao clicar em qualquer linha da TarefasPage.

import { useEffect, useState } from 'react'
import styles from './TaskModal.module.css'
import type { Task, TaskStatus } from './tarefas.types'

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

function BellIcon() {
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
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

// ── Status config ───────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  TaskStatus,
  { dot: string; label: string; bg: string; border: string; color: string }
> = {
  atrasada: {
    dot: '#ba1a1a',
    label: 'Atrasada',
    bg: '#fff1f2',
    border: '#fecdd3',
    color: '#ba1a1a',
  },
  em_andamento: {
    dot: '#3b82f6',
    label: 'Em andamento',
    bg: '#eff6ff',
    border: '#bfdbfe',
    color: '#1d4ed8',
  },
  pendente: {
    dot: '#94a3b8',
    label: 'Pendente',
    bg: '#f8fafc',
    border: '#e2e8f0',
    color: '#475569',
  },
  concluida: {
    dot: '#059669',
    label: 'Concluída',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    color: '#047857',
  },
}

// ── Mock activity log ───────────────────────────────────────────────────────────

const MOCK_NOTES =
  'Entrar em contato para confirmar disponibilidade e alinhar próximos passos. Verificar documentação pendente antes do contato.'

interface ActivityEntry {
  icon: 'system' | 'check'
  title: string
  date: string
  body?: string
}

function buildActivity(task: Task): ActivityEntry[] {
  const entries: ActivityEntry[] = [
    { icon: 'system', title: 'Tarefa criada', date: 'há 2 dias', body: `Tipo: ${task.type.label}` },
  ]
  if (task.status === 'em_andamento') {
    entries.push({ icon: 'system', title: 'Status atualizado para Em andamento', date: 'há 1 dia' })
  }
  if (task.status === 'concluida') {
    entries.push({ icon: 'check', title: 'Tarefa concluída', date: 'Ontem · 10:45' })
  }
  if (task.status === 'atrasada') {
    entries.push({
      icon: 'system',
      title: 'Prazo ultrapassado',
      date: task.dateTime,
      body: 'Tarefa não foi concluída no horário previsto.',
    })
  }
  return entries
}

// ── Props ───────────────────────────────────────────────────────────────────────

interface TaskModalProps {
  task: Task
  onClose: () => void
  onConcluir?: () => void
  onExcluir?: () => void
}

// ── Component ───────────────────────────────────────────────────────────────────

export function TaskModal({ task, onClose, onConcluir, onExcluir }: TaskModalProps) {
  const statusCfg = STATUS_CFG[task.status]
  const activity = buildActivity(task)
  const [comment, setComment] = useState('')
  const [localComments, setLocalComments] = useState<{ id: string; text: string }[]>([])

  function submitComment() {
    const trimmed = comment.trim()
    if (!trimmed) return
    setLocalComments((prev) => [{ id: crypto.randomUUID(), text: trimmed }, ...prev])
    setComment('')
  }

  // Fecha com Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop dismiss
    <div className={styles.overlay} onClick={onClose}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal stops propagation */}
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.identityArea}>
              {/* Breadcrumb */}
              <div className={styles.breadcrumb}>
                <span className={styles.breadcrumbLink}>Tarefas</span>
                <span className={styles.breadcrumbSep}>
                  <ChevronRightIcon />
                </span>
                <span className={styles.breadcrumbLink}>{task.type.label}</span>
              </div>

              {/* Title row */}
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

              {/* Lead & date strip */}
              <div className={styles.metaStrip}>
                <span className={styles.metaItem}>
                  <span className={styles.metaIcon}>
                    <PersonIcon />
                  </span>
                  {task.lead}
                </span>
                <span className={styles.metaDot}>·</span>
                <span className={styles.metaItem}>
                  <span className={styles.metaIcon}>
                    <ClockIcon />
                  </span>
                  {task.dateTime}
                </span>
              </div>
            </div>

            {/* Actions + close */}
            <div className={styles.headerActions}>
              {task.status !== 'concluida' && (
                <button
                  type="button"
                  className={styles.btnConcluir}
                  onClick={() => {
                    onConcluir?.()
                    onClose()
                  }}
                >
                  <CheckIcon />
                  Concluir
                </button>
              )}
              <button type="button" className={styles.btnSecondary}>
                <PencilIcon />
                Editar
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={() => {
                  onExcluir?.()
                  onClose()
                }}
              >
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
          {/* LEFT: detalhes + observações */}
          <div className={styles.leftCol}>
            {/* Info card */}
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
                    style={{
                      background: task.type.bg,
                      borderColor: task.type.border,
                      color: task.type.color,
                    }}
                  >
                    {task.type.label}
                  </span>
                </div>

                <div className={styles.attrCell}>
                  <span className={styles.attrLabel}>
                    <PersonIcon /> Lead / Cliente
                  </span>
                  <span className={styles.attrValue}>{task.lead}</span>
                </div>

                <div className={styles.attrCell}>
                  <span className={styles.attrLabel}>
                    <CalIcon /> Data &amp; Horário
                  </span>
                  <span className={styles.attrValue}>{task.dateTime}</span>
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
                    <BellIcon /> Lembrete
                  </span>
                  <span className={styles.attrValueMuted}>15 min antes</span>
                </div>

                <div className={styles.attrCell}>
                  <span className={styles.attrLabel}>
                    <PersonIcon /> Responsável
                  </span>
                  <span className={styles.attrValue}>Você</span>
                </div>
              </div>
            </div>

            {/* Observações card */}
            <div className={styles.card}>
              <div className={styles.cardTitleRow}>
                <span className={styles.cardTitle}>Observações</span>
                <button type="button" className={styles.editBtn}>
                  <PencilIcon /> Editar
                </button>
              </div>
              <div className={styles.obsBox}>
                <p className={styles.obsText}>{MOCK_NOTES}</p>
              </div>
            </div>
          </div>

          {/* RIGHT: histórico */}
          <div className={styles.rightCol}>
            <div className={styles.historyCard}>
              <div className={styles.historyHeader}>
                <span className={styles.historyTitle}>Histórico</span>
                <span className={styles.historyCount}>{activity.length}</span>
              </div>

              <div className={styles.timeline}>
                {activity.map((entry, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static activity list
                  <div key={i} className={styles.timelineEvent}>
                    <div className={styles.timelineLeft}>
                      <div
                        className={`${styles.timelineIcon} ${entry.icon === 'check' ? styles.timelineIconCheck : styles.timelineIconSystem}`}
                      >
                        {entry.icon === 'check' ? <CheckIcon /> : <ClockIcon />}
                      </div>
                      {i < activity.length - 1 && <div className={styles.timelineConnector} />}
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineRow}>
                        <span className={styles.timelineTitle}>{entry.title}</span>
                        <span className={styles.timelineDate}>{entry.date}</span>
                      </div>
                      {entry.body && <p className={styles.timelineBody}>{entry.body}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Comment input */}
              {localComments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                  {localComments.map(({ id, text }) => (
                    <div
                      key={id}
                      style={{
                        background: '#f1f5f9',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 13,
                        color: '#1e293b',
                      }}
                    >
                      {text}
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.commentInput}>
                <input
                  type="text"
                  className={styles.commentField}
                  placeholder="Adicionar uma nota ou comentário..."
                  aria-label="Nova nota"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      submitComment()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={submitComment}
                  style={{
                    padding: '0 10px',
                    background: '#0b1c30',
                    border: 'none',
                    borderRadius: 7,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
