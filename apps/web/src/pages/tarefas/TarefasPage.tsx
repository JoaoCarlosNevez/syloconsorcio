// TarefasPage — gerenciamento de atividades em 2 views: Lista e Calendário.
// Dados reais via /tasks (ver lib/tasks-api.ts) — filtro de status e busca
// são resolvidos no servidor (regra P0 — nunca filtrar no cliente).

import { useToast } from '@sylocrm/ui'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useLeadsQuery } from '../../hooks/useLeads'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useCreateTask, useDeleteTask, useTasksQuery, useUpdateTask } from '../../hooks/useTasks'
import { useTeamMembersQuery } from '../../hooks/useTeam'
import type {
  CreateTaskPayload,
  Task,
  TaskStatusFilter,
  UpdateTaskPayload,
} from '../../lib/tasks-api'
import styles from './TarefasPage.module.css'
import { TaskFormModal } from './TaskFormModal'
import { TaskModal } from './TaskModal'
import {
  STATUS_CFG,
  TYPE_BADGES,
  type ViewMode,
  displayStatus,
  formatTaskDateTime,
} from './tarefas.types'

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

// ── Shared: StatusBadge ───────────────────────────────────────────────────────

function StatusBadge({ task }: { task: Task }) {
  const cfg = STATUS_CFG[displayStatus(task)]
  return (
    <span className={styles.statusBadge}>
      <span className={styles.statusDot} style={{ background: cfg.dot }} />
      <span style={{ color: cfg.color }}>{cfg.label}</span>
    </span>
  )
}

// ── ListView ──────────────────────────────────────────────────────────────────

function ListView({
  tasks,
  leadNameById,
  onTaskClick,
  onToggleComplete,
}: {
  tasks: Task[]
  leadNameById: Map<string, string>
  onTaskClick: (task: Task) => void
  onToggleComplete: (task: Task) => void
}) {
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
          const badge = TYPE_BADGES[task.type]
          const leadLabel = task.leadId ? (leadNameById.get(task.leadId) ?? 'Lead') : 'Sem lead'
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
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: mouse-only shortcut — completing via TaskModal's "Concluir" button stays keyboard-accessible */}
                <span
                  title={done ? 'Reabrir tarefa' : 'Concluir tarefa'}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleComplete(task)
                  }}
                >
                  {done ? (
                    <span className={styles.checkboxChecked}>
                      <CheckSmIcon />
                    </span>
                  ) : (
                    <span className={styles.checkbox} />
                  )}
                </span>
                <span
                  className={styles.typeBadge}
                  style={{ background: badge.bg, borderColor: badge.border, color: badge.color }}
                >
                  {badge.label}
                </span>
                <span className={done ? styles.taskTitleDone : styles.taskTitle}>{task.title}</span>
              </div>
              <div className={`${styles.listCell} ${styles.lColLead}`}>
                <span className={styles.personIcon}>
                  <PersonIcon />
                </span>
                <span className={done ? styles.leadDone : styles.lead}>{leadLabel}</span>
              </div>
              <div className={`${styles.listCell} ${styles.lColDate}`}>
                <span className={done ? styles.dateDone : styles.date}>
                  {formatTaskDateTime(task.dueAt)}
                </span>
              </div>
              <div className={`${styles.listCell} ${styles.lColStatus}`}>
                <StatusBadge task={task} />
              </div>
              <div className={`${styles.listCell} ${styles.lColActions}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── CalendarView ──────────────────────────────────────────────────────────────

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

interface CalCell {
  date: number
  isCurrentMonth: boolean
  isToday: boolean
  events: Task[]
  extraCount: number
}

function buildCalendarGrid(year: number, month: number, today: Date, tasks: Task[]): CalCell[] {
  const firstDay = new Date(year, month, 1)
  const firstDow = firstDay.getDay() // 0=Sun
  const startOffset = firstDow === 0 ? 6 : firstDow - 1

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthLastDay = new Date(year, month, 0).getDate()

  const eventMap = new Map<string, Task[]>()
  for (const task of tasks) {
    const d = new Date(task.dueAt)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    const entries = eventMap.get(key) ?? []
    entries.push(task)
    eventMap.set(key, entries)
  }
  for (const entries of eventMap.values()) {
    entries.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
  }

  const cells: CalCell[] = []

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({
      date: prevMonthLastDay - i,
      isCurrentMonth: false,
      isToday: false,
      events: [],
      extraCount: 0,
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${month}-${d}`
    const allEvents = eventMap.get(key) ?? []
    cells.push({
      date: d,
      isCurrentMonth: true,
      isToday: year === today.getFullYear() && month === today.getMonth() && d === today.getDate(),
      events: allEvents.slice(0, 2),
      extraCount: Math.max(0, allEvents.length - 2),
    })
  }

  const remaining = (7 - (cells.length % 7)) % 7
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: d, isCurrentMonth: false, isToday: false, events: [], extraCount: 0 })
  }

  return cells
}

function CalendarView({
  tasks,
  onTaskClick,
}: {
  tasks: Task[]
  onTaskClick: (task: Task) => void
}) {
  const today = useMemo(() => new Date(), [])
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const cells = useMemo(
    () => buildCalendarGrid(year, month, today, tasks),
    [year, month, today, tasks],
  )
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

        <div className={styles.calDowRow}>
          {PT_WEEK_DAYS.map((d) => (
            <div key={d} className={styles.calDowCell}>
              {d}
            </div>
          ))}
        </div>

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
                    {cell.isToday && <span className={styles.calHojeLabel}>HOJE</span>}
                  </div>
                  <div className={styles.calEvents}>
                    {cell.events.map((task) => {
                      const badge = TYPE_BADGES[task.type]
                      const done = task.status === 'concluida'
                      return (
                        <button
                          key={task.id}
                          type="button"
                          className={styles.calEvent}
                          style={{
                            background: badge.bg,
                            borderColor: badge.border,
                            cursor: 'pointer',
                            width: '100%',
                            textAlign: 'left',
                          }}
                          onClick={() => onTaskClick(task)}
                        >
                          <span
                            className={styles.calEventDot}
                            style={{ background: badge.color }}
                          />
                          <span className={styles.calEventTime} style={{ color: badge.color }}>
                            {formatTaskDateTime(task.dueAt).split('· ')[1]}
                          </span>
                          <span
                            className={done ? styles.calEventTitleDone : styles.calEventTitle}
                            style={{ color: badge.color }}
                          >
                            {task.title}
                          </span>
                        </button>
                      )
                    })}
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

// ── TarefasPage ───────────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS: { value: TaskStatusFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'atrasada', label: 'Atrasada' },
]

export function TarefasPage() {
  const { organizationId, membership } = useActiveOrganization()
  const canAssign = membership?.permissions.includes('task.assign') ?? false
  const { data: currentUser } = useCurrentUser()
  const { data: teamData } = useTeamMembersQuery(organizationId)
  const members = teamData?.members ?? []
  const { data: leadsData } = useLeadsQuery(organizationId, { pageSize: 100, outcome: 'todos' })
  const leads = leadsData?.items ?? []
  const leadOptions = useMemo(
    () => leads.map((l) => ({ id: l.id, label: `${l.name} · ${l.phone}` })),
    [leads],
  )
  const leadNameById = useMemo(() => new Map(leads.map((l) => [l.id, l.name])), [leads])
  const { toast } = useToast()

  const [view, setView] = useState<ViewMode>('lista')
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('todos')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  // O card de Tarefas do início navega pra cá com a tarefa em state
  // (`{ openTask }`) pra abri-la direto, mesmo fora da página/filtro atual.
  const [selectedTask, setSelectedTask] = useState<Task | null>(
    (location.state as { openTask?: Task } | null)?.openTask ?? null,
  )
  const [creatingTask, setCreatingTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // Limpa o state da navegação pra tarefa não reabrir num refresh/voltar.
  useEffect(() => {
    if ((location.state as { openTask?: Task } | null)?.openTask) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  // Debounce da busca antes de disparar a query (regra P0).
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading } = useTasksQuery(organizationId, {
    status: statusFilter,
    search: search || undefined,
    pageSize: 100,
  })
  const tasks = useMemo(() => data?.items ?? [], [data])

  const createTask = useCreateTask(organizationId)
  const updateTask = useUpdateTask(organizationId)
  const deleteTask = useDeleteTask(organizationId)

  function handleToggleComplete(task: Task) {
    updateTask.mutate(
      { id: task.id, payload: { status: task.status === 'concluida' ? 'pendente' : 'concluida' } },
      {
        onError: (error) => {
          toast({
            type: 'error',
            title: 'Não foi possível atualizar a tarefa',
            description: error instanceof Error ? error.message : undefined,
          })
        },
      },
    )
  }

  function handleConcluir(task: Task) {
    updateTask.mutate(
      { id: task.id, payload: { status: 'concluida' } },
      { onSuccess: () => setSelectedTask(null) },
    )
  }

  function handleExcluir(task: Task) {
    deleteTask.mutate(task.id, { onSuccess: () => setSelectedTask(null) })
  }

  function handleCreate(payload: CreateTaskPayload) {
    createTask.mutate(payload, {
      onSuccess: () => setCreatingTask(false),
      onError: (error) => {
        toast({
          type: 'error',
          title: 'Não foi possível criar a atividade',
          description: error instanceof Error ? error.message : undefined,
        })
      },
    })
  }

  function handleEditSubmit(payload: UpdateTaskPayload) {
    if (!editingTask) return
    updateTask.mutate(
      { id: editingTask.id, payload },
      {
        onSuccess: (updated) => {
          setEditingTask(null)
          setSelectedTask(updated)
        },
        onError: (error) => {
          toast({
            type: 'error',
            title: 'Não foi possível salvar as alterações',
            description: error instanceof Error ? error.message : undefined,
          })
        },
      },
    )
  }

  return (
    <AppLayout>
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          leadName={selectedTask.leadId ? leadNameById.get(selectedTask.leadId) : undefined}
          members={members}
          onClose={() => setSelectedTask(null)}
          onConcluir={() => handleConcluir(selectedTask)}
          onExcluir={() => handleExcluir(selectedTask)}
          onEdit={() => {
            setEditingTask(selectedTask)
            setSelectedTask(null)
          }}
          onSaveNotes={(notes) =>
            updateTask.mutate(
              { id: selectedTask.id, payload: { notes } },
              { onSuccess: (updated) => setSelectedTask(updated) },
            )
          }
        />
      )}
      {creatingTask && currentUser && (
        <TaskFormModal
          mode="create"
          leadOptions={leadOptions}
          members={members}
          currentUserId={currentUser.id}
          canAssign={canAssign}
          onClose={() => setCreatingTask(false)}
          onSubmit={(payload) => handleCreate(payload as CreateTaskPayload)}
          isSubmitting={createTask.isPending}
        />
      )}
      {editingTask && currentUser && (
        <TaskFormModal
          mode="edit"
          initialTask={editingTask}
          leadOptions={leadOptions}
          members={members}
          currentUserId={currentUser.id}
          canAssign={canAssign}
          onClose={() => setEditingTask(null)}
          onSubmit={(payload) => handleEditSubmit(payload as UpdateTaskPayload)}
          isSubmitting={updateTask.isPending}
        />
      )}
      <div className={styles.page}>
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

        <div className={styles.controlBar}>
          <div className={styles.controlRow}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}>
                <SearchIcon />
              </span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar atividades..."
                aria-label="Buscar atividades"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <div className={styles.statusFilter}>
              <span className={styles.statusFilterLabel}>Status:</span>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.filterChip} ${statusFilter === opt.value ? styles.filterChipActive : ''}`}
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

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

        {!isLoading && view === 'lista' && (
          <ListView
            tasks={tasks}
            leadNameById={leadNameById}
            onTaskClick={setSelectedTask}
            onToggleComplete={handleToggleComplete}
          />
        )}
        {!isLoading && view === 'calendario' && (
          <CalendarView tasks={tasks} onTaskClick={setSelectedTask} />
        )}
      </div>
    </AppLayout>
  )
}
