// TarefasPage — gerenciamento de atividades em 2 views: Lista e Calendário.

import { type FormEvent, useMemo, useState } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import styles from './TarefasPage.module.css'
import { TaskModal } from './TaskModal'
import type { Task, TaskStatus, TypeBadge, ViewMode } from './tarefas.types'

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="6" y1="1" x2="6" y2="11" />
      <line x1="1" y1="6" x2="11" y2="6" />
    </svg>
  )
}

function SearchIcon() {
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg
      width="12"
      height="11"
      viewBox="0 0 24 22"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="8" y1="4" x2="22" y2="4" />
      <line x1="8" y1="11" x2="22" y2="11" />
      <line x1="8" y1="18" x2="22" y2="18" />
      <circle cx="2.5" cy="4" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="11" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function CalIcon() {
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
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg
      width="6"
      height="9"
      viewBox="0 0 10 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 1L1 8l8 7" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      width="6"
      height="9"
      viewBox="0 0 10 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 1l8 7-8 7" />
    </svg>
  )
}

function ChevronDownSmIcon() {
  return (
    <svg
      width="9"
      height="5"
      viewBox="0 0 12 7"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 1l5 5 5-5" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg
      width="11"
      height="11"
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

function DotsVertIcon() {
  return (
    <svg width="3" height="12" viewBox="0 0 4 16" fill="#94a3b8" aria-hidden="true">
      <circle cx="2" cy="2" r="1.8" />
      <circle cx="2" cy="8" r="1.8" />
      <circle cx="2" cy="14" r="1.8" />
    </svg>
  )
}

function CheckSmIcon() {
  return (
    <svg
      width="9"
      height="7"
      viewBox="0 0 12 10"
      fill="none"
      stroke="white"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="1 5 5 9 11 1" />
    </svg>
  )
}

// ── Types & data ──────────────────────────────────────────────────────────────

// ViewMode, TaskStatus, TypeBadge, Task → re-exported from ./tarefas.types

const T_LIGACAO: TypeBadge = {
  label: 'Ligação',
  bg: '#fffbeb',
  border: '#fde68a',
  color: '#92400e',
}
const T_REUNIAO: TypeBadge = {
  label: 'Reunião',
  bg: '#eff6ff',
  border: '#bfdbfe',
  color: '#1d4ed8',
}
const T_FOLLOWUP: TypeBadge = {
  label: 'Follow-up',
  bg: '#faf5ff',
  border: '#e9d5ff',
  color: '#7e22ce',
}
const T_TAREFA: TypeBadge = { label: 'Tarefa', bg: '#f3f4f6', border: '#e5e7eb', color: '#4b5563' }
const T_SIMULACAO: TypeBadge = {
  label: 'Simulação',
  bg: '#eef2ff',
  border: '#c7d2fe',
  color: '#4338ca',
}

const TASKS: Task[] = [
  {
    id: '1',
    type: T_LIGACAO,
    title: 'Entrar em contato com João Silva',
    lead: 'Lead: João Silva (#4920)',
    dateTime: 'Ontem · 17:00',
    status: 'atrasada',
  },
  {
    id: '2',
    type: T_REUNIAO,
    title: 'Reunião de apresentação de cotas',
    lead: 'Lead: Mariana Duarte',
    dateTime: 'Hoje · 14:30',
    status: 'em_andamento',
  },
  {
    id: '3',
    type: T_FOLLOWUP,
    title: 'Follow-up proposta consórcio imobiliário',
    lead: 'Lead: Aparecido Oliveira',
    dateTime: 'Hoje · 16:00',
    status: 'pendente',
  },
  {
    id: '4',
    type: T_TAREFA,
    title: 'Verificar documentação FGTS',
    lead: 'Lead: Mariana Duarte',
    dateTime: 'Amanhã · 10:00',
    status: 'concluida',
  },
]

const STATUS_CFG = {
  atrasada: { dot: '#ba1a1a', label: 'Atrasada', color: '#ba1a1a' },
  em_andamento: { dot: '#3b82f6', label: 'Em andamento', color: '#565e74' },
  pendente: { dot: '#94a3b8', label: 'Pendente', color: '#565e74' },
  concluida: { dot: '#059669', label: 'Concluída', color: '#047857' },
} as const

const PT_MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]
const PT_WEEK_DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']

// ── Calendar helpers ──────────────────────────────────────────────────────────

interface CalEvent {
  time: string
  title: string
  dotColor: string
  textColor: string
  bg: string
  border: string
  strikethrough?: boolean
}

interface CalCell {
  date: number
  isCurrentMonth: boolean
  isToday: boolean
  isYesterday: boolean
  isTomorrow: boolean
  events: CalEvent[]
  extraCount: number
}

const CAL_EVENT_DEFS = [
  {
    offset: -8,
    time: '11:00',
    title: 'Alinhamento interno',
    dotColor: '#3b82f6',
    textColor: '#1e40af',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    offset: -1,
    time: '17:00',
    title: 'Ligação João Silva',
    dotColor: '#ef4444',
    textColor: '#b91c1c',
    bg: '#fef2f2',
    border: 'rgba(254,202,202,0.7)',
  },
  {
    offset: 0,
    time: '14:30',
    title: 'Reunião de apresentação',
    dotColor: '#3b82f6',
    textColor: '#1e40af',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    offset: 0,
    time: '16:00',
    title: 'Follow-up consórcio',
    dotColor: '#94a3b8',
    textColor: '#6b21a8',
    bg: '#faf5ff',
    border: '#e9d5ff',
  },
  {
    offset: 1,
    time: '10:00',
    title: 'Doc FGTS',
    dotColor: '#059669',
    textColor: '#374151',
    bg: '#f3f4f6',
    border: '#e5e7eb',
    strikethrough: true,
  },
  {
    offset: 3,
    time: '09:30',
    title: 'Assembleia Rodobens',
    dotColor: '#f59e0b',
    textColor: '#92400e',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    offset: 3,
    time: '14:00',
    title: 'Simulação Mariana',
    dotColor: '#94a3b8',
    textColor: '#6b21a8',
    bg: '#faf5ff',
    border: '#e9d5ff',
  },
  {
    offset: 3,
    time: '15:30',
    title: 'Revisão de proposta',
    dotColor: '#3b82f6',
    textColor: '#1e40af',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    offset: 3,
    time: '17:00',
    title: 'Follow-up pendente',
    dotColor: '#f59e0b',
    textColor: '#92400e',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    offset: 12,
    time: '15:00',
    title: 'Reunião Diretoria',
    dotColor: '#3b82f6',
    textColor: '#1e40af',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
]

function buildCalendarGrid(year: number, month: number, today: Date): CalCell[] {
  const firstDay = new Date(year, month, 1)
  const firstDow = firstDay.getDay() // 0=Sun
  // Mon-first grid: Mon=0..Sun=6
  const startOffset = firstDow === 0 ? 6 : firstDow - 1

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthLastDay = new Date(year, month, 0).getDate()

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  // Build event map
  const eventMap = new Map<string, CalEvent[]>()
  for (const def of CAL_EVENT_DEFS) {
    const d = new Date(today)
    d.setDate(today.getDate() + def.offset)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!eventMap.has(key)) eventMap.set(key, [])
    const entries = eventMap.get(key)
    if (entries)
      entries.push({
        time: def.time,
        title: def.title,
        dotColor: def.dotColor,
        textColor: def.textColor,
        bg: def.bg,
        border: def.border,
        strikethrough: def.strikethrough,
      })
  }

  const cells: CalCell[] = []

  // Prev month
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({
      date: prevMonthLastDay - i,
      isCurrentMonth: false,
      isToday: false,
      isYesterday: false,
      isTomorrow: false,
      events: [],
      extraCount: 0,
    })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${month}-${d}`
    const allEvents = eventMap.get(key) ?? []
    const visible = allEvents.slice(0, 2)
    const extra = Math.max(0, allEvents.length - 2)
    cells.push({
      date: d,
      isCurrentMonth: true,
      isToday: year === today.getFullYear() && month === today.getMonth() && d === today.getDate(),
      isYesterday:
        year === yesterday.getFullYear() &&
        month === yesterday.getMonth() &&
        d === yesterday.getDate(),
      isTomorrow:
        year === tomorrow.getFullYear() &&
        month === tomorrow.getMonth() &&
        d === tomorrow.getDate(),
      events: visible,
      extraCount: extra,
    })
  }

  // Next month
  const remaining = (7 - (cells.length % 7)) % 7
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      date: d,
      isCurrentMonth: false,
      isToday: false,
      isYesterday: false,
      isTomorrow: false,
      events: [],
      extraCount: 0,
    })
  }

  return cells
}

// ── Shared: StatusBadge ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={styles.statusBadge}>
      <span className={styles.statusDot} style={{ background: cfg.dot }} />
      <span style={{ color: cfg.color }}>{cfg.label}</span>
    </span>
  )
}

// ── ListView ──────────────────────────────────────────────────────────────────

function ListView({ tasks, onTaskClick }: { tasks: Task[]; onTaskClick: (task: Task) => void }) {
  return (
    <div className={styles.viewContent}>
      <div className={styles.listCard}>
        <div className={styles.listHead}>
          <span className={`${styles.listHeadCell} ${styles.lColActivity}`}>Atividade</span>
          <span className={`${styles.listHeadCell} ${styles.lColLead}`}>Lead / Cliente</span>
          <span className={`${styles.listHeadCell} ${styles.lColDate}`}>Data &amp; Horário</span>
          <span className={`${styles.listHeadCell} ${styles.lColStatus}`}>Status</span>
          <span className={`${styles.listHeadCell} ${styles.lColActions}`}>Ações</span>
        </div>
        {tasks.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateTitle}>Nenhuma atividade encontrada</span>
            <span className={styles.emptyStateHint}>Tente ajustar os filtros ou a busca.</span>
          </div>
        )}
        {tasks.map((task, idx) => {
          const done = task.status === 'concluida'
          return (
            <button
              key={task.id}
              type="button"
              className={`${styles.listRow} ${idx > 0 ? styles.listRowBorder : ''} ${done ? styles.listRowDone : ''}`}
              onClick={() => onTaskClick(task)}
              style={{
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <div className={`${styles.listCell} ${styles.lColActivity}`}>
                {done ? (
                  <span className={styles.checkboxChecked} aria-label="Concluída">
                    <CheckSmIcon />
                  </span>
                ) : (
                  <span className={styles.checkbox} />
                )}
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
                <span className={done ? styles.taskTitleDone : styles.taskTitle}>{task.title}</span>
              </div>
              <div className={`${styles.listCell} ${styles.lColLead}`}>
                <span className={styles.personIcon}>
                  <PersonIcon />
                </span>
                <span className={done ? styles.leadDone : styles.lead}>{task.lead}</span>
              </div>
              <div className={`${styles.listCell} ${styles.lColDate}`}>
                <span className={done ? styles.dateDone : styles.date}>{task.dateTime}</span>
              </div>
              <div className={`${styles.listCell} ${styles.lColStatus}`}>
                <StatusBadge status={task.status} />
              </div>
              <div className={`${styles.listCell} ${styles.lColActions}`}>
                <button type="button" className={styles.dotsBtn} aria-label="Mais ações">
                  <DotsVertIcon />
                </button>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── CalendarView ──────────────────────────────────────────────────────────────

function CalendarView() {
  const today = useMemo(() => new Date(), [])
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const cells = useMemo(() => buildCalendarGrid(year, month, today), [year, month, today])
  const weeks = useMemo(() => {
    const rows: CalCell[][] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [cells])

  function prevMonth() {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else setMonth((m) => m + 1)
  }

  return (
    <div className={styles.viewContent}>
      <div className={styles.calCard}>
        {/* Navigation header */}
        <div className={styles.calNav}>
          <div className={styles.calNavLeft}>
            <div className={styles.calArrows}>
              <button
                type="button"
                className={styles.calArrowBtn}
                onClick={prevMonth}
                aria-label="Mês anterior"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                className={styles.calArrowBtn}
                onClick={nextMonth}
                aria-label="Próximo mês"
              >
                <ChevronRightIcon />
              </button>
            </div>
            <h2 className={styles.calTitle}>
              {PT_MONTHS[month]} {year}
            </h2>
          </div>
          <button
            type="button"
            className={styles.calTodayBtn}
            onClick={() => {
              setYear(today.getFullYear())
              setMonth(today.getMonth())
            }}
          >
            Hoje
          </button>
        </div>

        {/* Day-of-week header */}
        <div className={styles.calDowRow}>
          {PT_WEEK_DAYS.map((d) => (
            <div key={d} className={styles.calDowCell}>
              {d}
            </div>
          ))}
        </div>

        {/* Month grid */}
        <div className={styles.calGrid}>
          {weeks.map((week) => (
            <div
              key={week.map((c) => `${c.date}${c.isCurrentMonth}`).join('')}
              className={styles.calWeek}
            >
              {week.map((cell) => (
                <div
                  key={`${cell.date}-${String(cell.isCurrentMonth)}`}
                  className={[
                    styles.calCell,
                    !cell.isCurrentMonth && styles.calCellOther,
                    cell.isToday && styles.calCellToday,
                    cell.isYesterday && cell.isCurrentMonth && styles.calCellYesterday,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className={styles.calCellTop}>
                    {cell.isToday ? (
                      <span className={styles.calTodayCircle}>{cell.date}</span>
                    ) : (
                      <span
                        className={cell.isCurrentMonth ? styles.calDateNum : styles.calDateNumOther}
                      >
                        {cell.date}
                      </span>
                    )}
                    {cell.isYesterday && cell.isCurrentMonth && (
                      <span className={styles.calYesterdayLabel}>Ontem</span>
                    )}
                    {cell.isTomorrow && cell.isCurrentMonth && (
                      <span className={styles.calTomorrowLabel}>Amanhã</span>
                    )}
                    {cell.isToday && <span className={styles.calHojeLabel}>HOJE</span>}
                  </div>
                  <div className={styles.calEvents}>
                    {cell.events.map((ev) => (
                      <div
                        key={`${ev.time}-${ev.title}`}
                        className={styles.calEvent}
                        style={{ background: ev.bg, borderColor: ev.border }}
                      >
                        <span className={styles.calEventDot} style={{ background: ev.dotColor }} />
                        <span className={styles.calEventTime} style={{ color: ev.textColor }}>
                          {ev.time}
                        </span>
                        <span
                          className={
                            ev.strikethrough ? styles.calEventTitleDone : styles.calEventTitle
                          }
                          style={{ color: ev.textColor }}
                        >
                          {ev.title}
                        </span>
                      </div>
                    ))}
                    {cell.extraCount > 0 && (
                      <span className={styles.calMoreEvents}>+{cell.extraCount} atividades</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── NewTaskModal ──────────────────────────────────────────────────────────────

const TYPE_OPTIONS: TypeBadge[] = [T_LIGACAO, T_REUNIAO, T_FOLLOWUP, T_TAREFA, T_SIMULACAO]
const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'atrasada', label: 'Atrasada' },
]

interface NewTaskModalProps {
  onClose: () => void
  onCreate: (data: {
    title: string
    type: TypeBadge
    lead: string
    dateTime: string
    status: TaskStatus
  }) => void
}

function NewTaskModal({ onClose, onCreate }: NewTaskModalProps) {
  const [title, setTitle] = useState('')
  const [typeIdx, setTypeIdx] = useState(0)
  const [lead, setLead] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [status, setStatus] = useState<TaskStatus>('pendente')
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Título é obrigatório.')
      return
    }
    if (!lead.trim()) {
      setError('Lead é obrigatório.')
      return
    }
    if (!dateTime.trim()) {
      setError('Data e horário são obrigatórios.')
      return
    }
    onCreate({
      title: title.trim(),
      type: TYPE_OPTIONS[typeIdx] ?? T_TAREFA,
      lead: lead.trim(),
      dateTime: dateTime.trim(),
      status,
    })
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop dismiss
    <div className={styles.ntOverlay} onClick={onClose}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal stops propagation */}
      <div className={styles.ntModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.ntHeader}>
          <span className={styles.ntTitle}>Nova atividade</span>
          <button type="button" className={styles.ntCloseBtn} onClick={onClose} aria-label="Fechar">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className={styles.ntForm} onSubmit={handleSubmit}>
          <label className={styles.ntLabel}>
            Título
            <input
              className={styles.ntInput}
              type="text"
              placeholder="Ex: Ligar para João Silva"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className={styles.ntLabel}>
            Tipo
            <select
              className={styles.ntSelect}
              value={typeIdx}
              onChange={(e) => setTypeIdx(Number(e.target.value))}
            >
              {TYPE_OPTIONS.map((t, i) => (
                <option key={t.label} value={i}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.ntLabel}>
            Lead / Cliente
            <input
              className={styles.ntInput}
              type="text"
              placeholder="Ex: Lead: João Silva (#1234)"
              value={lead}
              onChange={(e) => setLead(e.target.value)}
            />
          </label>

          <label className={styles.ntLabel}>
            Data &amp; Horário
            <input
              className={styles.ntInput}
              type="text"
              placeholder="Ex: Hoje · 14:30"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
          </label>

          <label className={styles.ntLabel}>
            Status inicial
            <select
              className={styles.ntSelect}
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {error && <span className={styles.ntError}>{error}</span>}

          <div className={styles.ntActions}>
            <button type="button" className={styles.ntCancelBtn} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.ntSubmitBtn}>
              Criar atividade
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── TarefasPage ───────────────────────────────────────────────────────────────

export function TarefasPage() {
  const [view, setView] = useState<ViewMode>('lista')
  const [statusFilter, setStatusFilter] = useState<'todos' | TaskStatus>('todos')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [tasks, setTasks] = useState<Task[]>(TASKS)
  const [search, setSearch] = useState('')
  const [creatingTask, setCreatingTask] = useState(false)

  function handleConcluir(taskId: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'concluida' as TaskStatus } : t)),
    )
    if (selectedTask?.id === taskId) setSelectedTask((t) => (t ? { ...t, status: 'concluida' } : t))
  }

  function handleExcluir(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    setSelectedTask(null)
  }

  function handleCreateTask(data: {
    title: string
    type: TypeBadge
    lead: string
    dateTime: string
    status: TaskStatus
  }) {
    const newTask: Task = {
      id: String(Date.now()),
      ...data,
    }
    setTasks((prev) => [newTask, ...prev])
    setCreatingTask(false)
  }

  const filteredTasks = useMemo(() => {
    let list = statusFilter === 'todos' ? tasks : tasks.filter((t) => t.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) => t.title.toLowerCase().includes(q) || t.lead.toLowerCase().includes(q),
      )
    }
    return list
  }, [tasks, statusFilter, search])

  const STATUS_FILTER_LABELS: Record<'todos' | TaskStatus, string> = {
    todos: `Todos (${TASKS.length})`,
    pendente: 'Pendente',
    em_andamento: 'Em andamento',
    concluida: 'Concluída',
    atrasada: 'Atrasada',
  }

  return (
    <AppLayout>
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onConcluir={() => handleConcluir(selectedTask.id)}
          onExcluir={() => handleExcluir(selectedTask.id)}
        />
      )}
      {creatingTask && (
        <NewTaskModal onClose={() => setCreatingTask(false)} onCreate={handleCreateTask} />
      )}
      <div className={styles.page}>
        {/* ── Page header ──────────────────────────────────────────────── */}
        <header className={styles.pageHeader}>
          <div className={styles.pageTitles}>
            <h1 className={styles.pageTitle}>Tarefas</h1>
            <p className={styles.pageSubtitle}>Gerencie suas atividades e acompanhe sua agenda.</p>
          </div>
          <button type="button" className={styles.newBtn} onClick={() => setCreatingTask(true)}>
            <PlusIcon />
            Nova atividade
          </button>
        </header>

        {/* ── Control bar ──────────────────────────────────────────────── */}
        <div className={styles.controlBar}>
          {/* Row 1: search + status filter + period */}
          <div className={styles.controlRow}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}>
                <SearchIcon />
              </span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar atividades, leads..."
                aria-label="Buscar atividades"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className={styles.statusFilter}>
              <span className={styles.statusFilterLabel}>Status:</span>
              {(['todos', 'pendente', 'em_andamento', 'concluida', 'atrasada'] as const).map(
                (s) => (
                  <button
                    key={s}
                    type="button"
                    className={`${styles.filterChip} ${statusFilter === s ? styles.filterChipActive : ''}`}
                    onClick={() => setStatusFilter(s)}
                  >
                    {STATUS_FILTER_LABELS[s]}
                  </button>
                ),
              )}
            </div>

            <button type="button" className={styles.periodBtn}>
              Período: Esta semana
              <ChevronDownSmIcon />
            </button>
          </div>

          {/* Row 2: view switcher */}
          <div className={styles.controlRow}>
            <div className={styles.viewToggle}>
              {(['lista', 'calendario'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`${styles.viewBtn} ${view === v ? styles.viewBtnActive : ''}`}
                  onClick={() => setView(v)}
                >
                  {v === 'lista' && (
                    <>
                      <ListIcon /> Lista
                    </>
                  )}
                  {v === 'calendario' && (
                    <>
                      <CalIcon /> Calendário
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Views ────────────────────────────────────────────────────── */}
        {view === 'lista' && <ListView tasks={filteredTasks} onTaskClick={setSelectedTask} />}
        {view === 'calendario' && <CalendarView />}
      </div>
    </AppLayout>
  )
}
