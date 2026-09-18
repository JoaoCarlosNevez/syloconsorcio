// KanbanPage — funil de vendas em 6 estágios com drag-and-drop.
//
// Performance:
//  - @dnd-kit: usa CSS transform (GPU) em vez de layout reflow durante o drag
//  - Sensors com activationConstraint.distance=8 evitam drags acidentais
//  - Estado do board em Record<colId, CardData[]> — lookup O(1)
//  - onDragOver atualiza apenas as 2 colunas afetadas, não o board inteiro
//  - DragOverlay renderiza o card fantasma fora do DOM do board (sem reflow)

import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { EmptyState, Skeleton, useToast } from '@sylocrm/ui'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import { COLUMN_META, type CardData, type ColumnMeta } from '../../data/kanban-mock'
import { useLeadsQuery, useUpdateLead } from '../../hooks/useLeads'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useTeamMembersQuery } from '../../hooks/useTeam'
import {
  COLUMN_ID_TO_STAGE,
  formatBRL,
  groupLeadsByColumn,
  resolveAgent,
} from '../../lib/lead-adapters'
import type { TeamMember } from '../../lib/team-api'
import { CreateLeadModal } from './CreateLeadModal'
import styles from './KanbanPage.module.css'
import { LeadModal } from './LeadModal'

// ── Ícones de view toggle ──────────────────────────────────────────────────────

function KanbanViewIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function ListViewIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function ChevronRightSmIcon() {
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
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

// ── Ícones ────────────────────────────────────────────────────────────────────

function PhoneIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.37a16 16 0 0 0 7.72 7.72l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      width="9"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg
      width="8"
      height="5"
      viewBox="0 0 10 6"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 1l4 4 4-4" />
    </svg>
  )
}

function TagIcon() {
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
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function TransferIcon() {
  return (
    <svg
      width="14"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function VolumeIcon() {
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
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  )
}

function TicketIcon() {
  return (
    <svg
      width="14"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
    </svg>
  )
}

// Tipos e dados importados de ../../data/kanban-mock

// ── Helpers ───────────────────────────────────────────────────────────────────

function findColumnOfCard(board: Record<string, CardData[]>, cardId: string): string | null {
  for (const [colId, cards] of Object.entries(board)) {
    if (cards.some((c) => c.id === cardId)) return colId
  }
  return null
}

// ── CardView (visual puro, usado tanto no board quanto no DragOverlay) ────────

interface CardViewProps {
  card: CardData
  members: TeamMember[]
  isDragging?: boolean
}

function CardView({ card, members, isDragging }: CardViewProps) {
  const agent = resolveAgent(card.assignedUserId, members)
  return (
    <div className={`${styles.card} ${isDragging ? styles.cardDragging : ''}`}>
      <div className={styles.cardTop}>
        <span className={styles.cardName}>{card.name}</span>
        <button type="button" className={styles.whatsappBtn} aria-label={`WhatsApp ${card.name}`}>
          <WhatsAppIcon />
        </button>
      </div>
      <div className={styles.cardPhone}>
        <span className={styles.cardMetaIcon}>
          <PhoneIcon />
        </span>
        <span className={styles.cardPhoneText}>{card.phone}</span>
      </div>
      <div className={styles.cardCota}>
        <span className={styles.cardCotaText}>{card.cota}</span>
      </div>
      <div className={styles.cardMeta}>
        <span className={styles.cardMetaIcon}>
          <CalendarIcon />
        </span>
        <span className={styles.cardMetaDate}>{card.date}</span>
        <span className={styles.cardMetaDot}>•</span>
        <img src={agent.photo} alt={agent.name} className={styles.cardAgentAvatar} />
        <span className={styles.cardMetaAgent}>{agent.name}</span>
      </div>
      <div className={styles.cardFooter}>
        <span
          className={styles.sourceTag}
          style={{ background: card.sourceBg, color: card.sourceText }}
        >
          {card.source}
        </span>
        <span className={card.daysUrgent ? styles.daysTagUrgent : styles.daysTag}>{card.days}</span>
      </div>
    </div>
  )
}

// ── SortableCard (adiciona handles do @dnd-kit ao CardView) ───────────────────

function SortableCard({
  card,
  members,
  onCardClick,
}: {
  card: CardData
  members: TeamMember[]
  onCardClick: (card: CardData) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    // will-change instrui o browser a promover o elemento para camada GPU
    willChange: isDragging ? 'transform' : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) onCardClick(card)
      }}
    >
      <CardView card={card} members={members} />
    </div>
  )
}

// ── KanbanColumn ──────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  meta: ColumnMeta
  cards: CardData[]
  members: TeamMember[]
  onCardClick: (card: CardData) => void
  isOver?: boolean
}

function KanbanColumn({ meta, cards, members, onCardClick, isOver }: KanbanColumnProps) {
  const cardIds = useMemo(() => cards.map((c) => c.id), [cards])
  // Torna a própria coluna um alvo de drop — sem isto, uma coluna vazia não
  // tem nenhum item sortable pra servir de "over" e um card solto nela nunca
  // resolve destino (handleDragEnd nunca dispara o PATCH de stage).
  const { setNodeRef: setDroppableRef } = useDroppable({ id: meta.id })

  return (
    <section className={`${styles.column} ${isOver ? styles.columnOver : ''}`}>
      <div
        className={styles.columnHeader}
        style={{ background: meta.headerBg, borderColor: meta.headerBorder }}
      >
        <span className={styles.columnName} style={{ color: meta.headerText }}>
          {meta.name}
        </span>
        <span className={styles.columnCount} style={{ color: meta.countText }}>
          {cards.length}
        </span>
      </div>

      <div ref={setDroppableRef} className={styles.cardList} data-scroll="column">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} members={members} onCardClick={onCardClick} />
          ))}
        </SortableContext>
      </div>
    </section>
  )
}

// ── ListView ──────────────────────────────────────────────────────────────────

interface ListViewProps {
  board: Record<string, CardData[]>
  members: TeamMember[]
  onCardClick: (card: CardData) => void
  hideVenda?: boolean
}

function ListView({ board, members, onCardClick, hideVenda }: ListViewProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggle = (colId: string) => setCollapsed((prev) => ({ ...prev, [colId]: !prev[colId] }))

  const visibleMeta = hideVenda ? COLUMN_META.filter((m) => m.id !== 'venda') : COLUMN_META
  const totalVisible = visibleMeta.reduce((sum, m) => sum + (board[m.id]?.length ?? 0), 0)

  return (
    <div className={styles.listView}>
      <table className={styles.listTable}>
        <thead>
          <tr className={styles.listHead}>
            <th className={styles.listHeadCell}>Lead</th>
            <th className={styles.listHeadCell}>Telefone</th>
            <th className={styles.listHeadCell}>Cota / Interesse</th>
            <th className={styles.listHeadCell}>Origem</th>
            <th className={styles.listHeadCell}>Dias no Funil</th>
            <th className={styles.listHeadCell}>Responsável</th>
            <th className={styles.listHeadCell}>Cadastro</th>
            <th className={styles.listHeadCell} />
          </tr>
        </thead>
        <tbody>
          {totalVisible === 0 && (
            <tr>
              <td
                colSpan={8}
                style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}
              >
                Nenhum lead encontrado com o filtro atual.
              </td>
            </tr>
          )}
          {visibleMeta.map((meta) => {
            const cards = board[meta.id] ?? []
            const isCollapsed = collapsed[meta.id] ?? false
            return (
              <Fragment key={meta.id}>
                <tr className={styles.listGroupRow}>
                  <td colSpan={8} className={styles.listGroupCell}>
                    <button
                      type="button"
                      className={styles.listGroupBtn}
                      onClick={() => toggle(meta.id)}
                    >
                      <span
                        className={styles.listGroupChevron}
                        style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
                      >
                        <ChevronRightSmIcon />
                      </span>
                      <span
                        className={styles.listGroupDot}
                        style={{ background: meta.headerBorder }}
                      />
                      <span className={styles.listGroupName}>{meta.name}</span>
                      <span
                        className={styles.listGroupCount}
                        style={{
                          background: meta.headerBg,
                          color: meta.countText,
                          borderColor: meta.headerBorder,
                        }}
                      >
                        {cards.length}
                      </span>
                    </button>
                  </td>
                </tr>
                {!isCollapsed &&
                  cards.map((card, i) => {
                    const agent = resolveAgent(card.assignedUserId, members)
                    return (
                      <tr
                        key={card.id}
                        className={i % 2 === 0 ? styles.listRow : styles.listRowAlt}
                        onClick={() => onCardClick(card)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onCardClick(card)
                        }}
                      >
                        <td className={`${styles.listCell} ${styles.listCellName}`}>
                          <span className={styles.listName}>{card.name}</span>
                        </td>
                        <td className={styles.listCell}>
                          <span className={styles.listPhone}>{card.phone}</span>
                        </td>
                        <td className={styles.listCell}>
                          <span className={styles.listCota}>{card.cota}</span>
                        </td>
                        <td className={styles.listCell}>
                          <span
                            className={styles.listSourceTag}
                            style={{ background: card.sourceBg, color: card.sourceText }}
                          >
                            {card.source}
                          </span>
                        </td>
                        <td className={styles.listCell}>
                          <span
                            className={card.daysUrgent ? styles.listDaysUrgent : styles.listDays}
                          >
                            {card.days}
                          </span>
                        </td>
                        <td className={styles.listCell}>
                          <div className={styles.listAgent}>
                            <img
                              src={agent.photo}
                              alt={agent.name}
                              className={styles.listAgentAvatar}
                            />
                            <span className={styles.listAgentName}>{agent.name}</span>
                          </div>
                        </td>
                        <td className={styles.listCell}>
                          <span className={styles.listDate}>{card.date}</span>
                        </td>
                        <td
                          className={`${styles.listCell} ${styles.listCellActions}`}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className={styles.listWhatsappBtn}
                            aria-label={`WhatsApp ${card.name}`}
                          >
                            <WhatsAppIcon />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── KanbanPage ────────────────────────────────────────────────────────────────

export function KanbanPage() {
  const { organizationId } = useActiveOrganization()
  // pageSize=100: suficiente para o volume inicial do MVP. Lazy loading por
  // coluna (AGENTS.md §12) fica para quando o volume real exigir — ver nota
  // de status do projeto.
  const { data, isLoading: isLoadingLeads } = useLeadsQuery(organizationId, { pageSize: 100 })
  const updateLead = useUpdateLead(organizationId)
  const { data: teamData } = useTeamMembersQuery(organizationId)
  const members = teamData?.members ?? []
  const { toast } = useToast()

  const [board, setBoard] = useState<Record<string, CardData[]>>({})
  const [activeCard, setActiveCard] = useState<CardData | null>(null)
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [overColId, setOverColId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'todos' | 'aberto'>('aberto')
  const boardRef = useRef<HTMLDivElement>(null)
  // Coluna de onde o card saiu no início do drag — usada para saber se o
  // estágio realmente mudou quando o drag termina (handleDragEnd).
  const dragOriginColumnRef = useRef<string | null>(null)

  const isLoading = isLoadingLeads || !organizationId

  // Sincroniza o board local a partir dos dados reais sempre que a query
  // resolve (inclusive após criar/mover um lead, via invalidateQueries).
  useEffect(() => {
    if (!data) return
    setBoard(groupLeadsByColumn(data.items))
  }, [data])

  // Métricas calculadas a partir da página carregada. Com paginação real
  // (>100 leads) isto deixa de refletir o total exato — ok para o MVP atual.
  const totalLeads = data?.total ?? 0
  const volumeTotalCents = (data?.items ?? []).reduce((sum, lead) => sum + lead.valueCents, 0)
  const ticketMedioCents =
    data && data.items.length > 0 ? Math.round(volumeTotalCents / data.items.length) : 0

  // Converte scroll vertical do mouse em scroll horizontal no board.
  // Usa addEventListener com passive:false para poder chamar preventDefault,
  // o que não é possível com o onWheel sintético do React (passivo por padrão).
  useEffect(() => {
    const el = boardRef.current
    if (!el) return

    // Converte scroll vertical em horizontal no board.
    // O target é verificado para deixar o scroll vertical funcionar dentro das colunas.
    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-scroll="column"]') !== null) return
      e.preventDefault()
      // `el` é garantidamente não-null neste ponto (guarda do if acima)
      ;(el as HTMLDivElement).scrollLeft += e.deltaY + e.deltaX
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  // Sensores: PointerSensor com delay de 8px evita drag acidental ao clicar
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      const colId = findColumnOfCard(board, String(active.id))
      if (!colId) return
      dragOriginColumnRef.current = colId
      const card = (board[colId] ?? []).find((c) => c.id === active.id) ?? null
      setActiveCard(card)
    },
    [board],
  )

  const handleDragOver = useCallback(
    ({ active, over }: DragOverEvent) => {
      if (!over) {
        setOverColId(null)
        return
      }

      const activeColId = findColumnOfCard(board, String(active.id))
      const overColId =
        findColumnOfCard(board, String(over.id)) ??
        (COLUMN_META.some((m) => m.id === over.id) ? String(over.id) : null)

      setOverColId(overColId)
      if (!activeColId || !overColId || activeColId === overColId) return

      setBoard((prev) => {
        const sourceCards = [...(prev[activeColId] ?? [])]
        const destCards = [...(prev[overColId] ?? [])]

        const activeIdx = sourceCards.findIndex((c) => c.id === active.id)
        const overIdx = destCards.findIndex((c) => c.id === over.id)

        if (activeIdx === -1) return prev
        const moved = sourceCards.splice(activeIdx, 1)[0]
        if (!moved) return prev
        const insertAt = overIdx === -1 ? destCards.length : overIdx
        destCards.splice(insertAt, 0, moved)

        return { ...prev, [activeColId]: sourceCards, [overColId]: destCards }
      })
    },
    [board],
  )

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      setActiveCard(null)
      setOverColId(null)
      const originColId = dragOriginColumnRef.current
      dragOriginColumnRef.current = null

      const colId = findColumnOfCard(board, String(active.id))
      if (!colId) return

      // handleDragOver já moveu o card para a coluna de destino em tempo real —
      // aqui só precisamos persistir o novo estágio se a coluna realmente mudou.
      if (originColId && originColId !== colId) {
        const stage = COLUMN_ID_TO_STAGE[colId]
        if (stage) {
          updateLead.mutate(
            { id: String(active.id), payload: { stage } },
            {
              onError: (error) => {
                toast({
                  type: 'error',
                  title: 'Não foi possível mover o lead',
                  description: error instanceof Error ? error.message : undefined,
                })
              },
            },
          )
        }
      }

      if (!over || active.id === over.id) return

      setBoard((prev) => {
        const cards = prev[colId] ?? []
        const fromIdx = cards.findIndex((c) => c.id === active.id)
        const toIdx = cards.findIndex((c) => c.id === over.id)
        if (fromIdx === -1 || toIdx === -1) return prev
        return { ...prev, [colId]: arrayMove(cards, fromIdx, toIdx) }
      })
    },
    [board, updateLead, toast],
  )

  // Reconsulta o card mais recente do board a cada render — evita que o modal
  // mostre dados obsoletos (ex: responsável antigo) depois de uma mutação,
  // já que selectedCard guarda a referência capturada no momento do clique.
  const freshSelectedCard = selectedCard
    ? (Object.values(board)
        .flat()
        .find((c) => c.id === selectedCard.id) ?? selectedCard)
    : null

  return (
    <AppLayout>
      {freshSelectedCard && (
        <LeadModal card={freshSelectedCard} onClose={() => setSelectedCard(null)} />
      )}
      <div className={styles.page}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className={styles.header}>
          <h1 className={styles.title}>Kanban</h1>
          <div className={styles.actions}>
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={
                  viewMode === 'kanban'
                    ? `${styles.viewToggleBtn} ${styles.viewToggleBtnActive}`
                    : styles.viewToggleBtn
                }
                onClick={() => setViewMode('kanban')}
                aria-label="Visualização Kanban"
                title="Kanban"
              >
                <KanbanViewIcon />
              </button>
              <button
                type="button"
                className={
                  viewMode === 'list'
                    ? `${styles.viewToggleBtn} ${styles.viewToggleBtnActive}`
                    : styles.viewToggleBtn
                }
                onClick={() => setViewMode('list')}
                aria-label="Visualização Lista"
                title="Lista"
              >
                <ListViewIcon />
              </button>
            </div>
            <span className={styles.headerDivider} />
            <button
              type="button"
              className={`${styles.filterBtn} ${statusFilter === 'aberto' ? styles.filterBtnActive : ''}`}
              onClick={() => setStatusFilter((f) => (f === 'aberto' ? 'todos' : 'aberto'))}
            >
              {statusFilter === 'aberto' ? 'Em Aberto' : 'Todos'} <ChevronDownIcon />
            </button>
            <button type="button" className={styles.filterBtn}>
              <TagIcon /> Todas as tags <ChevronDownIcon />
            </button>
            <button type="button" className={styles.filterBtn}>
              <TransferIcon /> Transferência
            </button>
            <button
              type="button"
              className={styles.newLeadBtn}
              onClick={() => setIsCreateOpen(true)}
              disabled={!organizationId}
            >
              <PlusIcon /> Novo Lead
            </button>
          </div>
        </header>

        {/* ── Metrics Strip ────────────────────────────────────────────── */}
        <div className={styles.metricsStrip}>
          <div className={styles.metricsLeft}>
            <span className={styles.metric}>
              <span className={styles.metricIcon}>
                <VolumeIcon />
              </span>
              <span className={styles.metricLabel}>Volume Total em Cotas:</span>
              <span className={styles.metricValue}>R$ {formatBRL(volumeTotalCents)}</span>
            </span>
            <span className={styles.metricDivider} />
            <span className={styles.metric}>
              <span className={styles.metricIcon}>
                <TicketIcon />
              </span>
              <span className={styles.metricLabel}>Ticket Médio:</span>
              <span className={styles.metricValue}>R$ {formatBRL(ticketMedioCents)}</span>
            </span>
          </div>
          <div className={styles.activeLeads}>
            <span className={styles.activeDot} />
            <span className={styles.activeLabel}>{totalLeads} Leads Ativos no Funil</span>
          </div>
        </div>

        {/* ── Skeleton do board ────────────────────────────────────────── */}
        {isLoading && (
          <div className={styles.boardWrapper}>
            <div className={styles.board}>
              {COLUMN_META.map((meta, ci) => (
                <div key={meta.id} className={styles.column}>
                  <div
                    className={styles.columnHeader}
                    style={{ background: meta.headerBg, borderColor: meta.headerBorder }}
                  >
                    <Skeleton variant="text" width="90px" height="14px" />
                    <Skeleton
                      variant="rect"
                      width="24px"
                      height="20px"
                      style={{ borderRadius: 99 }}
                    />
                  </div>
                  <div className={styles.cardList}>
                    {Array.from({ length: ci < 2 ? 3 : ci < 4 ? 2 : 1 }).map((_, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton array — order never changes
                      <div key={i} className={styles.card} style={{ cursor: 'default', gap: 8 }}>
                        <Skeleton variant="text" width="80%" height="13px" />
                        <Skeleton variant="text" width="55%" height="11px" />
                        <Skeleton
                          variant="rect"
                          width="100%"
                          height="32px"
                          style={{ borderRadius: 8 }}
                        />
                        <Skeleton variant="text" width="65%" height="11px" />
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            paddingTop: 4,
                          }}
                        >
                          <Skeleton
                            variant="rect"
                            width="60px"
                            height="16px"
                            style={{ borderRadius: 4 }}
                          />
                          <Skeleton
                            variant="rect"
                            width="44px"
                            height="16px"
                            style={{ borderRadius: 99 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Estado vazio ─────────────────────────────────────────────── */}
        {!isLoading && totalLeads === 0 && (
          <EmptyState
            title="Nenhum lead no funil ainda"
            description="Cadastre o primeiro lead para começar a acompanhar o funil de vendas."
            action={
              <button
                type="button"
                className={styles.newLeadBtn}
                onClick={() => setIsCreateOpen(true)}
              >
                <PlusIcon /> Novo Lead
              </button>
            }
          />
        )}

        {/* ── Lista ────────────────────────────────────────────────────── */}
        {!isLoading && totalLeads > 0 && viewMode === 'list' && (
          <ListView
            board={board}
            members={members}
            onCardClick={setSelectedCard}
            hideVenda={statusFilter === 'aberto'}
          />
        )}

        {/* ── Board ────────────────────────────────────────────────────── */}
        {!isLoading && totalLeads > 0 && viewMode === 'kanban' && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className={styles.boardWrapper}>
              <div ref={boardRef} className={styles.board}>
                {COLUMN_META.map((meta) => (
                  <KanbanColumn
                    key={meta.id}
                    meta={meta}
                    cards={board[meta.id] ?? []}
                    members={members}
                    onCardClick={setSelectedCard}
                    isOver={overColId === meta.id}
                  />
                ))}
              </div>
            </div>

            {/* Card fantasma renderizado fora do DOM do board — sem reflow */}
            <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
              {activeCard ? <CardView card={activeCard} members={members} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {organizationId && (
        <CreateLeadModal
          open={isCreateOpen}
          organizationId={organizationId}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </AppLayout>
  )
}
