// TarefasPage — gerenciamento de atividades em 3 views: Lista, Calendário e Gantt.

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

function GanttIcon() {
  return (
    <svg
      width="15"
      height="8"
      viewBox="0 0 22 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="0" y1="2" x2="13" y2="2" />
      <line x1="5" y1="6" x2="22" y2="6" />
      <line x1="2" y1="10" x2="16" y2="10" />
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

function ClockIcon() {
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
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
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

function InfoIcon() {
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
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function DragHandleIcon() {
  return (
    <svg width="6" height="10" viewBox="0 0 8 14" fill="#94a3b8" aria-hidden="true">
      <circle cx="2" cy="2" r="1.5" />
      <circle cx="6" cy="2" r="1.5" />
      <circle cx="2" cy="7" r="1.5" />
      <circle cx="6" cy="7" r="1.5" />
      <circle cx="2" cy="12" r="1.5" />
      <circle cx="6" cy="12" r="1.5" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#059669" aria-hidden="true">
      <circle cx="12" cy="12" r="12" />
      <polyline
        points="7 13 11 17 17 9"
        stroke="white"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
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
    ganttOffset: -1,
    ganttSpan: 1,
    ganttLabel: 'Contato João',
    ganttLeadName: 'João Silva',
    ganttLeadSub: '#4920',
  },
  {
    id: '2',
    type: T_REUNIAO,
    title: 'Reunião de apresentação de cotas',
    lead: 'Lead: Mariana Duarte',
    dateTime: 'Hoje · 14:30',
    status: 'em_andamento',
    ganttOffset: 0,
    ganttSpan: 1,
    ganttLabel: 'Reunião Apresentação',
    ganttSubLabel: '14:30 - 15:30',
    ganttLeadName: 'Mariana Duarte',
    ganttLeadSub: 'Comercial',
  },
  {
    id: '3',
    type: T_FOLLOWUP,
    title: 'Follow-up proposta consórcio imobiliário',
    lead: 'Lead: Aparecido Oliveira',
    dateTime: 'Hoje · 16:00',
    status: 'pendente',
    ganttOffset: 0,
    ganttSpan: 1,
    ganttLabel: 'Follow-up Proposta',
    ganttSubLabel: '16:00',
    ganttLeadName: 'Aparecido Oliveira',
    ganttLeadSub: 'Imóvel PJ',
  },
  {
    id: '4',
    type: T_TAREFA,
    title: 'Verificar documentação FGTS',
    lead: 'Lead: Mariana Duarte',
    dateTime: 'Amanhã · 10:00',
    status: 'concluida',
    ganttOffset: 0,
    ganttSpan: 2,
    ganttLabel: 'Documentação FGTS',
    ganttSubLabel: 'Validação Completa',
    ganttLeadName: 'Mariana Duarte',
    ganttLeadSub: 'Validação',
  },
]

const GANTT_EXTRA: Task = {
  id: '5',
  type: T_SIMULACAO,
  title: 'Simulação comparativa de lance embutido',
  lead: 'Carlos Alberto',
  dateTime: '2 dias',
  status: 'pendente',
  ganttOffset: 1,
  ganttSpan: 2,
  ganttLabel: 'Simulação Lance Embutido',
  ganttSubLabel: 'Previsão 48h',
  ganttLeadName: 'Carlos Alberto',
  ganttLeadSub: 'Novo Lead',
}

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
const PT_MONTHS_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
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

// ── Gantt helpers ─────────────────────────────────────────────────────────────

interface WeekDay {
  label: string
  dayNum: string
  isToday: boolean
  isWeekend: boolean
}

function getWeekDays(today: Date): WeekDay[] {
  const dow = today.getDay()
  const mondayOffset = dow === 0 ? 6 : dow - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - mondayOffset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return {
      label: PT_WEEK_DAYS[i],
      dayNum: d.getDate().toString().padStart(2, '0'),
      isToday: d.toDateString() === today.toDateString(),
      isWeekend: i >= 5,
    }
  })
}

function getTodayWeekIdx(today: Date): number {
  const dow = today.getDay()
  return dow === 0 ? 6 : dow - 1
}

function ganttBarStyle(task: Task): { bg: string; border: string; isDashed: boolean } {
  if (task.status === 'atrasada') return { bg: '#fff1f2', border: '#fecdd3', isDashed: false }
  if (task.status === 'concluida') return { bg: '#ecfdf5', border: '#6ee7b7', isDashed: false }
  if (task.status === 'em_andamento') return { bg: '#faf5ff', border: '#e9d5ff', isDashed: false }
  if (task.type.label === 'Simulação')
    return { bg: 'rgba(238,242,255,0.85)', border: '#a5b4fc', isDashed: true }
  return { bg: '#fffbeb', border: '#fcd34d', isDashed: false }
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
                padding: 0,
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

// ── GanttView ─────────────────────────────────────────────────────────────────

interface GanttViewProps {
  tasks: Task[]
  todayIdx: number
  weekDays: WeekDay[]
  today: Date
}

function GanttView({ tasks, todayIdx, weekDays, today }: GanttViewProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const COL = 100 / 7

  function colStart(task: Task) {
    return Math.max(0, Math.min(6, todayIdx + task.ganttOffset))
  }
  function colSpan(task: Task) {
    const s = colStart(task)
    return Math.min(task.ganttSpan, 7 - s)
  }
  function dateRange(task: Task): string | null {
    if (task.ganttSpan <= 1) return null
    const s = colStart(task)
    const e = Math.min(s + task.ganttSpan - 1, 6)
    const monthAbr = PT_MONTHS_SHORT[today.getMonth()]
    return `${weekDays[s]?.dayNum} - ${weekDays[e]?.dayNum} ${monthAbr}`
  }

  return (
    <div className={styles.ganttOuter}>
      <div className={styles.ganttCard}>
        {/* ── Split container ───────────────────────────────────────────── */}
        <div className={styles.ganttSplit}>
          {/* LEFT: task table */}
          <div className={styles.ganttLeft}>
            {/* Table header */}
            <div className={styles.ganttLeftHead}>
              <span className={styles.ganttColActivity}>Atividade</span>
              <span className={styles.ganttColLead}>Lead / Cliente</span>
              <span className={styles.ganttColStatus}>Status</span>
            </div>
            {/* Rows */}
            {tasks.map((task, idx) => {
              const done = task.status === 'concluida'
              return (
                <div
                  key={task.id}
                  className={`${styles.ganttLeftRow} ${idx > 0 ? styles.ganttRowBorder : ''}`}
                >
                  <div className={styles.ganttColActivity}>
                    <span
                      className={styles.typeBadgeSmall}
                      style={{
                        background: task.type.bg,
                        borderColor: task.type.border,
                        color: task.type.color,
                      }}
                    >
                      {task.type.label}
                    </span>
                    <span className={done ? styles.ganttTaskTitleDone : styles.ganttTaskTitle}>
                      {task.title}
                    </span>
                    {task.ganttSubLabel && !done && (
                      <span className={styles.ganttTaskTime}>
                        <ClockIcon />{' '}
                        {task.ganttOffset === 0 && task.ganttSpan === 2
                          ? 'Concluído ontem'
                          : task.ganttSubLabel}
                      </span>
                    )}
                    {done && (
                      <span className={styles.ganttConcluded}>
                        <CheckSmIcon /> Concluído ontem
                      </span>
                    )}
                  </div>
                  <div className={styles.ganttColLead}>
                    <span className={styles.ganttLeadName}>{task.ganttLeadName}</span>
                    {task.ganttLeadSub && (
                      <span className={styles.ganttLeadSub}>{task.ganttLeadSub}</span>
                    )}
                  </div>
                  <div className={styles.ganttColStatus}>
                    <StatusBadge status={task.status} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* RIGHT: timeline */}
          <div className={styles.ganttRight}>
            {/* Timeline header */}
            <div className={styles.ganttTimeHead}>
              {weekDays.map((day) => (
                <div
                  key={day.label}
                  className={[
                    styles.ganttTimeDayCol,
                    day.isToday && styles.ganttTimeDayToday,
                    day.isWeekend && styles.ganttTimeDayWeekend,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className={styles.ganttDayLabel}>{day.label}</span>
                  <span className={styles.ganttDayNum}>{day.dayNum}</span>
                  {day.isToday && <span className={styles.ganttHojeBadge}>HOJE</span>}
                </div>
              ))}
            </div>

            {/* Timeline body */}
            <div className={styles.ganttTimeBody}>
              {/* Column tracks */}
              {weekDays.map((day, i) => (
                <div
                  key={day.label}
                  className={[
                    styles.ganttTrack,
                    day.isToday && styles.ganttTrackToday,
                    day.isWeekend && styles.ganttTrackWeekend,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ left: `${i * COL}%`, width: `${COL}%` }}
                />
              ))}
              {/* Today indicator line */}
              <div className={styles.ganttTodayLine} style={{ left: `${todayIdx * COL}%` }}>
                <div className={styles.ganttTodayDot} />
              </div>

              {/* Task rows */}
              {tasks.map((task, idx) => {
                const s = colStart(task)
                const sp = colSpan(task)
                const bs = ganttBarStyle(task)
                const dr = dateRange(task)

                return (
                  <div
                    key={task.id}
                    className={`${styles.ganttTimeRow} ${idx > 0 ? styles.ganttRowBorder : ''}`}
                  >
                    <div
                      className={`${styles.ganttBar} ${bs.isDashed ? styles.ganttBarDashed : ''}`}
                      style={{
                        left: `calc(${s * COL}% + 8px)`,
                        right: `calc(${(7 - s - sp) * COL}% + 8px)`,
                        background: bs.bg,
                        borderColor: bs.border,
                      }}
                    >
                      {/* Atrasada: dot + label */}
                      {task.status === 'atrasada' && (
                        <div className={styles.ganttBarInner}>
                          <span className={styles.ganttBarDot} style={{ background: '#f43f5e' }} />
                          <span className={styles.ganttBarTitle} style={{ color: '#9f1239' }}>
                            {task.ganttLabel}
                          </span>
                          <DragHandleIcon />
                        </div>
                      )}
                      {/* Em andamento: 2 lines + resize handles */}
                      {task.status === 'em_andamento' && (
                        <div className={styles.ganttBarInner}>
                          <div className={styles.ganttBarTextStack}>
                            <span className={styles.ganttBarTitle} style={{ color: '#581c87' }}>
                              {task.ganttLabel}
                            </span>
                            {task.ganttSubLabel && (
                              <span className={styles.ganttBarSub} style={{ color: '#9333ea' }}>
                                {task.ganttSubLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Follow-up pendente: clock + label + time */}
                      {task.status === 'pendente' && task.type.label !== 'Simulação' && (
                        <div className={styles.ganttBarInner}>
                          <span className={styles.ganttBarClockWrap} style={{ color: '#b45309' }}>
                            <ClockIcon />
                          </span>
                          <div className={styles.ganttBarTextStack}>
                            <span className={styles.ganttBarTitle} style={{ color: '#78350f' }}>
                              {task.ganttLabel}
                            </span>
                            {task.ganttSubLabel && (
                              <span className={styles.ganttBarSub} style={{ color: '#b45309' }}>
                                {task.ganttSubLabel}
                              </span>
                            )}
                          </div>
                          <span className={styles.ganttBarDot} style={{ background: '#f59e0b' }} />
                        </div>
                      )}
                      {/* Simulação: clock + label + date badge */}
                      {task.status === 'pendente' && task.type.label === 'Simulação' && (
                        <div className={styles.ganttBarInner}>
                          <span className={styles.ganttBarClockWrap} style={{ color: '#4f46e5' }}>
                            <ClockIcon />
                          </span>
                          <div className={styles.ganttBarTextStack}>
                            <span className={styles.ganttBarTitle} style={{ color: '#312e81' }}>
                              {task.ganttLabel}
                            </span>
                            {task.ganttSubLabel && (
                              <span className={styles.ganttBarSub} style={{ color: '#4f46e5' }}>
                                {task.ganttSubLabel}
                              </span>
                            )}
                          </div>
                          {dr && (
                            <span
                              className={styles.ganttDateBadge}
                              style={{ background: 'rgba(224,231,255,0.7)', color: '#4338ca' }}
                            >
                              {dr}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Concluída: checkmark circle + label + date range badge */}
                      {task.status === 'concluida' && (
                        <div className={styles.ganttBarInner}>
                          <CheckCircleIcon />
                          <div className={styles.ganttBarTextStack}>
                            <span className={styles.ganttBarTitle} style={{ color: '#064e3b' }}>
                              {task.ganttLabel}
                            </span>
                            {task.ganttSubLabel && (
                              <span className={styles.ganttBarSub} style={{ color: '#047857' }}>
                                {task.ganttSubLabel}
                              </span>
                            )}
                          </div>
                          {dr && (
                            <span
                              className={styles.ganttDateBadge}
                              style={{ background: 'rgba(209,250,229,0.8)', color: '#047857' }}
                            >
                              {dr}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Footer legend ─────────────────────────────────────────────── */}
        <div className={styles.ganttFooter}>
          <div className={styles.ganttLegend}>
            <span className={styles.ganttLegendItem}>
              <InfoIcon />
              <span className={styles.ganttLegendLabel}>Legenda rápida:</span>
            </span>
            {(
              [
                { color: '#f43f5e', label: 'Atrasada' },
                { color: '#3b82f6', label: 'Em curso' },
                { color: '#10b981', label: 'Concluída' },
                { color: '#94a3b8', label: 'Pendente' },
              ] as const
            ).map((item) => (
              <span key={item.label} className={styles.ganttLegendItem}>
                <span className={styles.ganttLegendDot} style={{ background: item.color }} />
                <span className={styles.ganttLegendText}>{item.label}</span>
              </span>
            ))}
          </div>
          <div className={styles.ganttHint}>
            <span className={styles.ganttHintText}>
              {weekOffset === 0
                ? 'Semana atual'
                : weekOffset < 0
                  ? `${Math.abs(weekOffset)} semana${Math.abs(weekOffset) > 1 ? 's' : ''} atrás`
                  : `+${weekOffset} semana${weekOffset > 1 ? 's' : ''}`}
            </span>
            <div className={styles.ganttNavBtns}>
              <button
                type="button"
                className={styles.ganttNavBtn}
                aria-label="Semana anterior"
                onClick={() => setWeekOffset((w) => w - 1)}
              >
                <ChevronLeftIcon />
              </button>
              {weekOffset !== 0 && (
                <button
                  type="button"
                  className={styles.ganttNavBtn}
                  style={{ fontSize: 11, padding: '0 6px', minWidth: 'auto' }}
                  onClick={() => setWeekOffset(0)}
                >
                  Hoje
                </button>
              )}
              <button
                type="button"
                className={styles.ganttNavBtn}
                aria-label="Próxima semana"
                onClick={() => setWeekOffset((w) => w + 1)}
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
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
      type: TYPE_OPTIONS[typeIdx],
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

  const today = useMemo(() => new Date(), [])
  const weekDays = useMemo(() => getWeekDays(today), [today])
  const todayWeekIdx = useMemo(() => getTodayWeekIdx(today), [today])

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
      ganttOffset: 1,
      ganttSpan: 1,
      ganttLabel: data.title,
      ganttLeadName: data.lead,
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

  const ganttTasks = [...TASKS, GANTT_EXTRA]

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
              {view === 'gantt'
                ? `${PT_MONTHS[today.getMonth()]} ${today.getFullYear()} / Semana ${getWeekNumber(today)}`
                : 'Período: Esta semana'}
              <ChevronDownSmIcon />
            </button>
          </div>

          {/* Row 2: view switcher */}
          <div className={styles.controlRow}>
            <div className={styles.viewToggle}>
              {(['lista', 'calendario', 'gantt'] as ViewMode[]).map((v) => (
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
                  {v === 'gantt' && (
                    <>
                      <GanttIcon /> Gantt
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
        {view === 'gantt' && (
          <GanttView tasks={ganttTasks} todayIdx={todayWeekIdx} weekDays={weekDays} today={today} />
        )}
      </div>
    </AppLayout>
  )
}

// ── Utility ───────────────────────────────────────────────────────────────────

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
