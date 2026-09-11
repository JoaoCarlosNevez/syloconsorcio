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
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCallback, useMemo, useState } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import styles from './KanbanPage.module.css'

// ── Ícones ────────────────────────────────────────────────────────────────────

function PhoneIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.37a16 16 0 0 0 7.72 7.72l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="9" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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
    <svg width="8" height="5" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 1l4 4 4-4" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function TransferIcon() {
  return (
    <svg width="14" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function VolumeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  )
}

function TicketIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
    </svg>
  )
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface CardData {
  id: string
  name: string
  phone: string
  cota: string
  date: string
  agent: string
  source: string
  sourceBg: string
  sourceText: string
  days: string
  daysUrgent: boolean
}

interface ColumnMeta {
  id: string
  name: string
  headerBg: string
  headerBorder: string
  headerText: string
  countText: string
}

// ── Configuração das colunas (estático — cores/nomes nunca mudam) ─────────────

const COLUMN_META: ColumnMeta[] = [
  { id: 'lead',        name: 'Lead',            headerBg: 'rgba(226,232,240,0.7)', headerBorder: 'rgba(203,213,225,0.5)', headerText: '#1e293b', countText: '#334155' },
  { id: 'atendimento', name: 'Em Atendimento',  headerBg: 'rgba(254,243,199,0.7)', headerBorder: '#fde68a',              headerText: '#451a03', countText: '#92400e' },
  { id: 'simulacao',   name: 'Simulação',        headerBg: 'rgba(237,233,254,0.7)', headerBorder: '#ddd6fe',              headerText: '#2e1065', countText: '#5b21b6' },
  { id: 'proposta',    name: 'Proposta',          headerBg: 'rgba(255,228,230,0.7)', headerBorder: '#fecdd3',              headerText: '#4c0519', countText: '#9f1239' },
  { id: 'fechado',     name: 'Fechado',           headerBg: 'rgba(224,242,254,0.7)', headerBorder: '#bae6fd',              headerText: '#082f49', countText: '#075985' },
  { id: 'venda',       name: 'Venda Concluída',   headerBg: 'rgba(209,250,229,0.7)', headerBorder: '#a7f3d0',              headerText: '#022c22', countText: '#065f46' },
]

// ── Dados mock ────────────────────────────────────────────────────────────────

const INITIAL_BOARD: Record<string, CardData[]> = {
  lead: [
    { id: 'c1',  name: 'Aparecido Oliveira E Silva',  phone: '(11) 94868-0815', cota: 'Cota R$ 350.000 (Imobiliário)', date: '01/06/2026', agent: 'Do Carmo', source: 'FACEBOOK',  sourceBg: '#2563eb', sourceText: '#fff', days: '101d', daysUrgent: true  },
    { id: 'c2',  name: 'Yuri Nunes',                  phone: '(11) 98937-8401', cota: 'Cota R$ 120.000 (Auto)',        date: '28/05/2026', agent: 'Do Carmo', source: 'FACEBOOK',  sourceBg: '#2563eb', sourceText: '#fff', days: '106d', daysUrgent: true  },
    { id: 'c3',  name: 'David Alex',                  phone: '(11) 93934-0525', cota: 'Cota R$ 500.000 (Imóvel Alto)', date: '25/05/2026', agent: 'Do Carmo', source: 'FACEBOOK',  sourceBg: '#2563eb', sourceText: '#fff', days: '109d', daysUrgent: true  },
    { id: 'c4',  name: 'Silvana Dos Santos Saraiva',  phone: '(11) 97955-9513', cota: 'Cota R$ 220.000 (Imobiliário)', date: '25/05/2026', agent: 'Do Carmo', source: 'FACEBOOK',  sourceBg: '#2563eb', sourceText: '#fff', days: '104d', daysUrgent: true  },
  ],
  atendimento: [
    { id: 'c5',  name: 'Mario Laurentino De Sa',      phone: '(11) 91234-5678', cota: 'Cota R$ 280.000 (Imobiliário)', date: '15/06/2026', agent: 'Do Carmo', source: 'INSTAGRAM', sourceBg: '#7c3aed', sourceText: '#fff', days: '42d',  daysUrgent: false },
    { id: 'c6',  name: 'Fernanda Lima Costa',         phone: '(11) 99876-5432', cota: 'Cota R$ 180.000 (Pesado)',      date: '10/06/2026', agent: 'Do Carmo', source: 'INDICAÇÃO', sourceBg: '#059669', sourceText: '#fff', days: '67d',  daysUrgent: true  },
    { id: 'c7',  name: 'Roberto Carlos Meireles',     phone: '(11) 97654-3210', cota: 'Cota R$ 420.000 (Planta)',      date: '08/06/2026', agent: 'Do Carmo', source: 'FACEBOOK',  sourceBg: '#2563eb', sourceText: '#fff', days: '55d',  daysUrgent: false },
  ],
  simulacao: [
    { id: 'c8',  name: 'Ana Paula Ferreira',          phone: '(11) 92345-6789', cota: 'Cota R$ 300.000 (Imobiliário)', date: '20/06/2026', agent: 'Do Carmo', source: 'SITE',      sourceBg: '#334155', sourceText: '#fff', days: '28d',  daysUrgent: false },
    { id: 'c9',  name: 'Carlos Eduardo Souza',        phone: '(11) 98765-4321', cota: 'Cota R$ 150.000 (Veículo)',     date: '18/06/2026', agent: 'Do Carmo', source: 'FACEBOOK',  sourceBg: '#2563eb', sourceText: '#fff', days: '33d',  daysUrgent: false },
    { id: 'c10', name: 'Patricia Mendes Rocha',       phone: '(11) 91111-2222', cota: 'Cota R$ 600.000 (Comercial)',   date: '12/06/2026', agent: 'Do Carmo', source: 'INDICAÇÃO', sourceBg: '#059669', sourceText: '#fff', days: '48d',  daysUrgent: false },
  ],
  proposta: [
    { id: 'c11', name: 'Juliana Alves Pinto',         phone: '(11) 93333-4444', cota: 'Cota R$ 250.000 (Condomínio)', date: '22/06/2026', agent: 'Do Carmo', source: 'INSTAGRAM', sourceBg: '#7c3aed', sourceText: '#fff', days: '14d',  daysUrgent: false },
    { id: 'c12', name: 'Marcos Antonio Lima',         phone: '(11) 95555-6666', cota: 'Cota R$ 190.000 (Terreno)',    date: '21/06/2026', agent: 'Do Carmo', source: 'FACEBOOK',  sourceBg: '#2563eb', sourceText: '#fff', days: '19d',  daysUrgent: false },
  ],
  fechado: [
    { id: 'c13', name: 'Luisa Rodrigues Santos',      phone: '(11) 97777-8888', cota: '2 Cotas R$ 400.000 (800k)',    date: '25/06/2026', agent: 'Do Carmo', source: 'INDICAÇÃO', sourceBg: '#059669', sourceText: '#fff', days: '7d',   daysUrgent: false },
    { id: 'c14', name: 'Diego Henrique Barbosa',      phone: '(11) 99999-0000', cota: 'Cota R$ 260.000 (SUV)',        date: '24/06/2026', agent: 'Do Carmo', source: 'FACEBOOK',  sourceBg: '#2563eb', sourceText: '#fff', days: '11d',  daysUrgent: false },
  ],
  venda: [
    { id: 'c15', name: 'Beatriz Cunha Moraes',        phone: '(11) 91234-9876', cota: 'Cota R$ 550.000 (Imobiliário)', date: '30/06/2026', agent: 'Do Carmo', source: 'INDICAÇÃO', sourceBg: '#059669', sourceText: '#fff', days: '2d',   daysUrgent: false },
    { id: 'c16', name: 'Thiago Monteiro Alves',       phone: '(11) 98765-1234', cota: 'Cota R$ 130.000 (Automóvel)',   date: '28/06/2026', agent: 'Do Carmo', source: 'SITE',      sourceBg: '#334155', sourceText: '#fff', days: '5d',   daysUrgent: false },
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findColumnOfCard(board: Record<string, CardData[]>, cardId: string): string | null {
  for (const [colId, cards] of Object.entries(board)) {
    if (cards.some(c => c.id === cardId)) return colId
  }
  return null
}

// ── CardView (visual puro, usado tanto no board quanto no DragOverlay) ────────

interface CardViewProps {
  card: CardData
  isDragging?: boolean
}

function CardView({ card, isDragging }: CardViewProps) {
  return (
    <div className={`${styles.card} ${isDragging ? styles.cardDragging : ''}`}>
      <div className={styles.cardTop}>
        <span className={styles.cardName}>{card.name}</span>
        <button type="button" className={styles.whatsappBtn} aria-label={`WhatsApp ${card.name}`}>
          <WhatsAppIcon />
        </button>
      </div>
      <div className={styles.cardPhone}>
        <span className={styles.cardMetaIcon}><PhoneIcon /></span>
        <span className={styles.cardPhoneText}>{card.phone}</span>
      </div>
      <div className={styles.cardCota}>
        <span className={styles.cardCotaText}>{card.cota}</span>
      </div>
      <div className={styles.cardMeta}>
        <span className={styles.cardMetaIcon}><CalendarIcon /></span>
        <span className={styles.cardMetaDate}>{card.date}</span>
        <span className={styles.cardMetaDot}>•</span>
        <span className={styles.cardMetaIcon}><PersonIcon /></span>
        <span className={styles.cardMetaAgent}>{card.agent}</span>
      </div>
      <div className={styles.cardFooter}>
        <span className={styles.sourceTag} style={{ background: card.sourceBg, color: card.sourceText }}>
          {card.source}
        </span>
        <span className={card.daysUrgent ? styles.daysTagUrgent : styles.daysTag}>
          {card.days}
        </span>
      </div>
    </div>
  )
}

// ── SortableCard (adiciona handles do @dnd-kit ao CardView) ───────────────────

function SortableCard({ card }: { card: CardData }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    // will-change instrui o browser a promover o elemento para camada GPU
    willChange: isDragging ? 'transform' : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardView card={card} />
    </div>
  )
}

// ── KanbanColumn ──────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  meta: ColumnMeta
  cards: CardData[]
}

function KanbanColumn({ meta, cards }: KanbanColumnProps) {
  const cardIds = useMemo(() => cards.map(c => c.id), [cards])

  return (
    <section className={styles.column}>
      <div
        className={styles.columnHeader}
        style={{ background: meta.headerBg, borderColor: meta.headerBorder }}
      >
        <span className={styles.columnName} style={{ color: meta.headerText }}>{meta.name}</span>
        <span className={styles.columnCount} style={{ color: meta.countText }}>{cards.length}</span>
      </div>

      <div className={styles.cardList}>
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <SortableCard key={card.id} card={card} />
          ))}
        </SortableContext>
      </div>
    </section>
  )
}

// ── KanbanPage ────────────────────────────────────────────────────────────────

export function KanbanPage() {
  const [board, setBoard] = useState<Record<string, CardData[]>>(INITIAL_BOARD)
  const [activeCard, setActiveCard] = useState<CardData | null>(null)

  // Sensores: PointerSensor com delay de 8px evita drag acidental ao clicar
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    const colId = findColumnOfCard(board, String(active.id))
    if (!colId) return
    const card = (board[colId] ?? []).find(c => c.id === active.id) ?? null
    setActiveCard(card)
  }, [board])

  const handleDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over) return

    const activeColId = findColumnOfCard(board, String(active.id))
    const overColId =
      findColumnOfCard(board, String(over.id)) ??
      (COLUMN_META.some(m => m.id === over.id) ? String(over.id) : null)

    if (!activeColId || !overColId || activeColId === overColId) return

    setBoard(prev => {
      const sourceCards = [...(prev[activeColId] ?? [])]
      const destCards   = [...(prev[overColId] ?? [])]

      const activeIdx = sourceCards.findIndex(c => c.id === active.id)
      const overIdx   = destCards.findIndex(c => c.id === over.id)

      if (activeIdx === -1) return prev
      const moved = sourceCards.splice(activeIdx, 1)[0]
      if (!moved) return prev
      const insertAt = overIdx === -1 ? destCards.length : overIdx
      destCards.splice(insertAt, 0, moved)

      return { ...prev, [activeColId]: sourceCards, [overColId]: destCards }
    })
  }, [board])

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveCard(null)
    if (!over || active.id === over.id) return

    const colId = findColumnOfCard(board, String(active.id))
    if (!colId) return

    setBoard(prev => {
      const cards   = prev[colId] ?? []
      const fromIdx = cards.findIndex(c => c.id === active.id)
      const toIdx   = cards.findIndex(c => c.id === over.id)
      if (fromIdx === -1 || toIdx === -1) return prev
      return { ...prev, [colId]: arrayMove(cards, fromIdx, toIdx) }
    })
  }, [board])

  return (
    <AppLayout>
      <div className={styles.page}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className={styles.header}>
          <h1 className={styles.title}>Kanban</h1>
          <div className={styles.actions}>
            <button type="button" className={styles.filterBtn}>
              Em Aberto <ChevronDownIcon />
            </button>
            <button type="button" className={styles.filterBtn}>
              <TagIcon /> Todas as tags <ChevronDownIcon />
            </button>
            <button type="button" className={styles.filterBtn}>
              <TransferIcon /> Transferência
            </button>
            <button type="button" className={styles.newLeadBtn}>
              <PlusIcon /> Novo Lead
            </button>
          </div>
        </header>

        {/* ── Metrics Strip ────────────────────────────────────────────── */}
        <div className={styles.metricsStrip}>
          <div className={styles.metricsLeft}>
            <span className={styles.metric}>
              <span className={styles.metricIcon}><VolumeIcon /></span>
              <span className={styles.metricLabel}>Volume Total em Cotas:</span>
              <span className={styles.metricValue}>R$ 8.450.000,00</span>
            </span>
            <span className={styles.metricDivider} />
            <span className={styles.metric}>
              <span className={styles.metricIcon}><TicketIcon /></span>
              <span className={styles.metricLabel}>Ticket Médio:</span>
              <span className={styles.metricValue}>R$ 280.000,00</span>
            </span>
          </div>
          <div className={styles.activeLeads}>
            <span className={styles.activeDot} />
            <span className={styles.activeLabel}>69 Leads Ativos no Funil</span>
          </div>
        </div>

        {/* ── Board ────────────────────────────────────────────────────── */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className={styles.board}>
            {COLUMN_META.map(meta => (
              <KanbanColumn key={meta.id} meta={meta} cards={board[meta.id] ?? []} />
            ))}
          </div>

          {/* Card fantasma renderizado fora do DOM do board — sem reflow */}
          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
            {activeCard ? <CardView card={activeCard} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </AppLayout>
  )
}
