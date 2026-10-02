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
import { Dropdown, EmptyState, Skeleton, useToast } from '@sylocrm/ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import type { CardData, ColumnMeta } from '../../data/kanban-mock'
import { useFunnelsQuery } from '../../hooks/useFunnels'
import { useLeadsQuery, useUpdateLead } from '../../hooks/useLeads'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useOrganizationSettingsQuery } from '../../hooks/useOrganizationSettings'
import { useTeamMembersQuery } from '../../hooks/useTeam'
import type { FunnelStage } from '../../lib/funnels-api'
import {
  formatBRL,
  groupLeadsByColumn,
  matchesLeadSearch,
  resolveAgent,
  resolveCardOutcome,
  toCardData,
} from '../../lib/lead-adapters'
import type { OutcomeFilter } from '../../lib/leads-api'
import { deriveStageColors } from '../../lib/stage-colors'
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

function SearchIcon() {
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

function UserIcon() {
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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
  const cardOutcome = resolveCardOutcome(card)
  const outcomeClass =
    cardOutcome === 'ganho' ? styles.cardWon : cardOutcome === 'perdido' ? styles.cardLost : ''
  return (
    <div className={`${styles.card} ${outcomeClass} ${isDragging ? styles.cardDragging : ''}`}>
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
  const totalCents = useMemo(() => cards.reduce((sum, card) => sum + card.valueCents, 0), [cards])
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
        <div className={styles.columnHeaderTop}>
          <span className={styles.columnName} style={{ color: meta.headerText }}>
            {meta.name}
          </span>
          <span className={styles.columnCount} style={{ color: meta.countText }}>
            {cards.length}
          </span>
        </div>
        <span className={styles.columnSum} style={{ color: meta.countText }}>
          R$ {formatBRL(totalCents)}
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
  columns: ColumnMeta[]
  members: TeamMember[]
  onCardClick: (card: CardData) => void
}

function ListView({ board, columns, members, onCardClick }: ListViewProps) {
  const stageById = useMemo(() => new Map(columns.map((meta) => [meta.id, meta])), [columns])

  // Lista única, sem agrupar por estágio — o estágio vira só mais uma coluna
  // (ver stageById acima). Mais recentes primeiro, mesma ordem padrão da API.
  const rows = useMemo(
    () =>
      Object.values(board)
        .flat()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [board],
  )

  return (
    <div className={styles.listView}>
      <table className={styles.listTable}>
        <thead>
          <tr className={styles.listHead}>
            <th className={styles.listHeadCell}>Lead</th>
            <th className={styles.listHeadCell}>Estágio</th>
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
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={9}
                style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}
              >
                Nenhum lead encontrado com o filtro atual.
              </td>
            </tr>
          )}
          {rows.map((card, i) => {
            const agent = resolveAgent(card.assignedUserId, members)
            const cardOutcome = resolveCardOutcome(card)
            const outcomeClass =
              cardOutcome === 'ganho'
                ? styles.listRowWon
                : cardOutcome === 'perdido'
                  ? styles.listRowLost
                  : ''
            const stageMeta = stageById.get(card.stageId)
            return (
              <tr
                key={card.id}
                className={`${i % 2 === 0 ? styles.listRow : styles.listRowAlt} ${outcomeClass}`}
                onClick={() => onCardClick(card)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onCardClick(card)
                }}
              >
                <td className={`${styles.listCell} ${styles.listCellName}`}>
                  <span className={styles.listName}>{card.name}</span>
                </td>
                <td className={styles.listCell}>
                  {stageMeta && (
                    <span
                      className={styles.listSourceTag}
                      style={{ background: stageMeta.headerBg, color: stageMeta.countText }}
                    >
                      {stageMeta.name}
                    </span>
                  )}
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
                  <span className={card.daysUrgent ? styles.listDaysUrgent : styles.listDays}>
                    {card.days}
                  </span>
                </td>
                <td className={styles.listCell}>
                  <div className={styles.listAgent}>
                    <img src={agent.photo} alt={agent.name} className={styles.listAgentAvatar} />
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
        </tbody>
      </table>
    </div>
  )
}

// ── KanbanPage ────────────────────────────────────────────────────────────────

const OUTCOME_LABEL: Record<OutcomeFilter, string> = {
  aberto: 'Em Aberto',
  ganho: 'Ganho',
  perdido: 'Perdido',
  todos: 'Todos',
}

export function KanbanPage() {
  const navigate = useNavigate()
  const { organizationId, membership } = useActiveOrganization()
  const canViewLost = membership?.permissions.includes('lead.manage_lost') ?? false
  // Filtrar por vendedor é pra quem enxerga os leads da equipe (Dono e
  // Supervisor) — o Vendedor só vê os próprios.
  const canFilterByAssignee = membership?.permissions.includes('lead.assign') ?? false
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null)
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('aberto')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagFilterOpen, setTagFilterOpen] = useState(false)
  const tagFilterRef = useRef<HTMLDivElement>(null)

  // ── Funil ativo ────────────────────────────────────────────────────────────
  const { data: funnelsData } = useFunnelsQuery(organizationId)
  const funnels = funnelsData?.funnels ?? []
  const [activeFunnelId, setActiveFunnelId] = useState<string | null>(null)

  // Restaura o último funil escolhido (por organização) ou cai no padrão —
  // roda de novo sempre que a lista de funis muda (ex: primeiro carregamento).
  useEffect(() => {
    if (!organizationId || funnels.length === 0) return
    const storageKey = `sylocrm:kanban:activeFunnel:${organizationId}`
    const stored = localStorage.getItem(storageKey)
    const isStoredValid = funnels.some((f) => f.id === stored)
    if (isStoredValid) {
      setActiveFunnelId(stored)
      return
    }
    const fallback = funnels.find((f) => f.isDefault) ?? funnels[0]
    if (fallback) setActiveFunnelId(fallback.id)
  }, [organizationId, funnels])

  // ── Abrir um lead vindo de fora (notificação de lead novo) ──────────────────
  // A notificação navega pra cá com `{ openLeadId, funnelId }` no state. Troca
  // pro funil do lead e abre o card assim que ele aparecer no board. Guardado
  // em state (não só lido no mount) porque o clique pode acontecer com o
  // Kanban já aberto — aí a página não remonta.
  const location = useLocation()
  const [pendingLead, setPendingLead] = useState<{
    openLeadId: string
    funnelId: string | null
  } | null>(null)

  useEffect(() => {
    const state = location.state as { openLeadId?: string; funnelId?: string | null } | null
    if (!state?.openLeadId) return
    setPendingLead({ openLeadId: state.openLeadId, funnelId: state.funnelId ?? null })
    // Limpa o state pra não reabrir num refresh/voltar.
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    if (!pendingLead?.funnelId) return
    if (funnels.some((f) => f.id === pendingLead.funnelId)) {
      setActiveFunnelId(pendingLead.funnelId)
    }
  }, [pendingLead, funnels])

  function handleSelectFunnel(id: string) {
    setActiveFunnelId(id)
    if (organizationId) {
      localStorage.setItem(`sylocrm:kanban:activeFunnel:${organizationId}`, id)
    }
  }

  const activeFunnel = funnels.find((f) => f.id === activeFunnelId) ?? null
  const activeStages: FunnelStage[] = activeFunnel?.stages ?? []
  const columns: ColumnMeta[] = useMemo(
    () =>
      activeStages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        ...deriveStageColors(stage.color),
      })),
    [activeStages],
  )

  // pageSize=100: suficiente para o volume inicial do MVP. Lazy loading por
  // coluna (AGENTS.md §12) fica para quando o volume real exigir — ver nota
  // de status do projeto.
  const { data: teamData } = useTeamMembersQuery(organizationId)
  const members = teamData?.members ?? []
  // Vendedores do filtro: membros ativos, em ordem alfabética.
  const assigneeOptions = members
    .filter((m) => m.status === 'ACTIVE')
    .map((m) => ({ userId: m.userId, label: m.name ?? m.email }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  // Ignora uma seleção que não existe na organização ativa (ex: trocou de org).
  const activeAssignee =
    canFilterByAssignee && assigneeOptions.some((o) => o.userId === assigneeFilter)
      ? assigneeFilter
      : null
  const { data, isLoading: isLoadingLeads } = useLeadsQuery(organizationId, {
    pageSize: 100,
    funnelId: activeFunnelId ?? undefined,
    outcome: outcomeFilter,
    tags: selectedTags,
    assignedTo: activeAssignee ?? undefined,
  })
  const updateLead = useUpdateLead(organizationId)
  const { data: settingsData } = useOrganizationSettingsQuery(organizationId)
  const leadTags = settingsData?.organization.leadTags ?? []
  const { toast } = useToast()

  // Fecha o painel de tags ao clicar fora — mesmo padrão do Dropdown
  // compartilhado, mas sem fechar a cada seleção (é multi-select).
  useEffect(() => {
    if (!tagFilterOpen) return
    function handler(e: MouseEvent) {
      if (!tagFilterRef.current?.contains(e.target as Node)) setTagFilterOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [tagFilterOpen])

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const [board, setBoard] = useState<Record<string, CardData[]>>({})
  const [activeCard, setActiveCard] = useState<CardData | null>(null)
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [overColId, setOverColId] = useState<string | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  // Coluna de onde o card saiu no início do drag — usada para saber se o
  // estágio realmente mudou quando o drag termina (handleDragEnd).
  const dragOriginColumnRef = useRef<string | null>(null)

  const isLoading = isLoadingLeads || !organizationId || !activeFunnelId

  // Segunda metade do "abrir lead vindo de fora" (ver pendingLead acima):
  // espera o funil certo carregar e o card entrar no board, então abre.
  useEffect(() => {
    if (!pendingLead || !data) return
    const funnelReady =
      !pendingLead.funnelId ||
      activeFunnelId === pendingLead.funnelId ||
      !funnels.some((f) => f.id === pendingLead.funnelId)
    if (!funnelReady) return

    if (!data.items.some((lead) => lead.id === pendingLead.openLeadId)) {
      setPendingLead(null)
      toast({
        type: 'info',
        title: 'Lead não encontrado',
        description: 'Ele pode ter sido removido ou estar fora dos filtros atuais.',
      })
      return
    }
    const card = Object.values(board)
      .flat()
      .find((c) => c.id === pendingLead.openLeadId)
    if (!card) return // o board ainda não sincronizou com `data`
    setSelectedCard(card)
    setPendingLead(null)
  }, [pendingLead, data, board, activeFunnelId, funnels, toast])

  // Sincroniza o board local a partir dos dados reais sempre que a query
  // resolve (inclusive após criar/mover um lead, via invalidateQueries).
  useEffect(() => {
    if (!data) return
    const filtered = data.items.filter((lead) => matchesLeadSearch(lead, searchQuery))
    setBoard(groupLeadsByColumn(filtered, activeStages))
  }, [data, activeStages, searchQuery])

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
        (columns.some((m) => m.id === over.id) ? String(over.id) : null)

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
    [board, columns],
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
      // Ganho/Perdido são desacoplados do estágio (ver plano de funis) — não
      // existe mais "última coluna especial" bloqueada aqui; qualquer estágio
      // aceita drop normalmente, e "Marcar como Ganho" continua sendo uma ação
      // à parte, só habilitada na ficha do lead quando ele já está na última etapa.
      if (originColId && originColId !== colId) {
        updateLead.mutate(
          { id: String(active.id), payload: { stageId: colId } },
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
      {freshSelectedCard && activeFunnel && (
        <LeadModal
          card={freshSelectedCard}
          funnel={activeFunnel}
          funnels={funnels}
          onClose={() => setSelectedCard(null)}
        />
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
            <div className={styles.searchBox}>
              <span className={styles.searchIcon}>
                <SearchIcon />
              </span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar por nome ou telefone..."
                aria-label="Buscar lead por nome ou telefone"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {funnels.length > 1 && (
              <Dropdown
                trigger={
                  <span className={`${styles.filterBtn} ${styles.filterBtnActive}`}>
                    {activeFunnel?.name ?? 'Funil'} <ChevronDownIcon />
                  </span>
                }
                items={[
                  ...funnels.map((funnel) => ({
                    key: funnel.id,
                    label: funnel.name,
                    onSelect: () => handleSelectFunnel(funnel.id),
                  })),
                  {
                    key: 'manage',
                    label: 'Gerenciar funis',
                    onSelect: () => navigate('/app/config'),
                  },
                ]}
              />
            )}
            <Dropdown
              trigger={
                <span className={`${styles.filterBtn} ${styles.filterBtnActive}`}>
                  {OUTCOME_LABEL[outcomeFilter]} <ChevronDownIcon />
                </span>
              }
              items={(['aberto', 'ganho', 'perdido', 'todos'] as const)
                // Só "Perdido" exige lead.manage_lost; "Todos" é liberado pro Vendedor.
                .filter((outcome) => outcome !== 'perdido' || canViewLost)
                .map((outcome) => ({
                  key: outcome,
                  label: OUTCOME_LABEL[outcome],
                  onSelect: () => setOutcomeFilter(outcome),
                }))}
            />
            {canFilterByAssignee && (
              <Dropdown
                trigger={
                  <span
                    className={`${styles.filterBtn} ${activeAssignee ? styles.filterBtnActive : ''}`}
                  >
                    <UserIcon />
                    {assigneeOptions.find((o) => o.userId === activeAssignee)?.label ??
                      'Todos os vendedores'}
                    <ChevronDownIcon />
                  </span>
                }
                items={[
                  {
                    key: 'all',
                    label: 'Todos os vendedores',
                    onSelect: () => setAssigneeFilter(null),
                  },
                  { key: 'assignee-label', type: 'label', label: 'Responsável' },
                  ...assigneeOptions.map((option) => ({
                    key: option.userId,
                    label: option.label,
                    onSelect: () => setAssigneeFilter(option.userId),
                  })),
                ]}
              />
            )}
            <div className={styles.tagFilterWrapper} ref={tagFilterRef}>
              <button
                type="button"
                className={`${styles.filterBtn} ${selectedTags.length > 0 ? styles.filterBtnActive : ''}`}
                onClick={() => setTagFilterOpen((v) => !v)}
              >
                <TagIcon />
                {selectedTags.length > 0 ? `${selectedTags.length} tag(s)` : 'Todas as tags'}
                <ChevronDownIcon />
              </button>
              {tagFilterOpen && (
                <div className={styles.tagFilterPanel}>
                  {leadTags.length === 0 ? (
                    <p className={styles.tagFilterEmpty}>
                      Nenhuma tag cadastrada. Configure em Configurações → Organização.
                    </p>
                  ) : (
                    <>
                      {leadTags.map((tag) => (
                        <label key={tag} className={styles.tagFilterItem}>
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(tag)}
                            onChange={() => toggleTag(tag)}
                          />
                          {tag}
                        </label>
                      ))}
                      {selectedTags.length > 0 && (
                        <button
                          type="button"
                          className={styles.tagFilterClear}
                          onClick={() => setSelectedTags([])}
                        >
                          Limpar seleção
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
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
              {/* Skeleton genérico — os estágios reais ainda não carregaram
                  neste ponto (dependem do funil ativo). */}
              {Array.from({ length: 4 }).map((_, ci) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton array — order never changes
                <div key={ci} className={styles.column}>
                  <div
                    className={styles.columnHeader}
                    style={{
                      background: 'rgba(226,232,240,0.7)',
                      borderColor: 'rgba(203,213,225,0.5)',
                    }}
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
            columns={columns}
            members={members}
            onCardClick={setSelectedCard}
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
                {columns.map((meta) => (
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

      {organizationId && activeFunnelId && (
        <CreateLeadModal
          open={isCreateOpen}
          organizationId={organizationId}
          funnelId={activeFunnelId}
          onClose={() => setIsCreateOpen(false)}
          // Abre o card do lead recém-criado. Até o board recarregar, o modal
          // usa este CardData montado da resposta (ver freshSelectedCard).
          onCreated={(lead) => {
            if (activeFunnel) setSelectedCard(toCardData(lead, activeFunnel.stages))
          }}
        />
      )}
    </AppLayout>
  )
}
