// LeadModal — ficha completa do lead, aberta ao clicar em um card do Kanban.
// Design: Figma SYLOAPP node 276:590

import { useEffect } from 'react'
import type { CardData } from './KanbanPage'
import styles from './LeadModal.module.css'

// ── Ícones (SVG inline — padrão do projeto) ────────────────────────────────────

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
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

function ChevronRightIcon() {
  return (
    <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.37a16 16 0 0 0 7.72 7.72l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function WhatsAppIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function SignalIcon() {
  return (
    <svg width="12" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function DotsIcon() {
  return (
    <svg width="3" height="13" viewBox="0 0 3 13" fill="currentColor" aria-hidden="true">
      <circle cx="1.5" cy="1.5" r="1.5" /><circle cx="1.5" cy="6.5" r="1.5" /><circle cx="1.5" cy="11.5" r="1.5" />
    </svg>
  )
}

function TransferIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function ThumbsDownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z" />
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="8 21 12 17 16 21" /><line x1="12" y1="17" x2="12" y2="11" />
      <path d="M7 4h10M17 4c0 0 0 8-5 8S7 4 7 4" />
      <path d="M6 4c-2 0-4 1-4 4 0 3 2 4 4 4M18 4c2 0 4 1 4 4 0 3-2 4-4 4" />
    </svg>
  )
}

function LightningIcon() {
  return (
    <svg width="8" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg width="13" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  )
}

// ── Usuário admin (placeholder até integração com API) ────────────────────────

const ADMIN_USER = {
  name: 'Ennyo Café',
  team: 'Porthis',
  photo: '/sara-profile.png',
}

// Retorna o perfil completo do responsável.
// Por enquanto usa o admin como fallback — substituir por lookup de API quando disponível.
function getAgentProfile(_name: string) {
  return ADMIN_USER
}

// ── Dados estáticos (mock) ─────────────────────────────────────────────────────

const FUNNEL_STAGES = [
  '1. Lead',
  '2. Em Atendimento',
  '3. Agendamento',
  '4. Visita / Simulação',
  '5. Proposta',
  '6. Venda Fechada',
]

const MOCK_TASKS = [
  {
    id: 't1',
    title: 'Enviar tabela comparativa de lances livres vs. embutidos (R$ 350k)',
    dueLabel: 'Hoje às 17:30',
    dueUrgent: true,
    responsible: 'Do Carmo',
    channel: 'Via WhatsApp',
    priority: 'Prioritário',
    urgent: true,
  },
  {
    id: 't2',
    title: 'Confirmar se o FGTS já foi liberado no aplicativo Caixa',
    dueLabel: 'Amanhã, 02/06 às 11:00',
    dueUrgent: false,
    responsible: 'Fabione Alencar',
    channel: null,
    priority: 'Planejado',
    urgent: false,
  },
]

interface HistoryEvent {
  id: string
  type: 'system' | 'whatsapp' | 'lead_created'
  title: string
  timestamp: string
  byLabel: string | null
  byName: string | null
  detail: string | null
  detailBold: string | null
  message?: string
  source?: string
}

const MOCK_HISTORY: HistoryEvent[] = [
  {
    id: 'h1',
    type: 'system',
    title: 'Vendedor alterado',
    timestamp: '01/07/26 13:32',
    byLabel: 'por',
    byName: 'Fabione',
    detail: 'Maui',
    detailBold: 'Do Carmo',
  },
  {
    id: 'h2',
    type: 'whatsapp',
    title: 'WhatsApp Enviado (Sara IA)',
    timestamp: '03/06/26 20:15',
    message: '"Olá Aparecido! Notamos seu interesse no consórcio de R$ 350 mil do Parque do Sol. Preparamos 3 lances simulados para você..."',
    byLabel: null,
    byName: null,
    detail: null,
    detailBold: null,
  },
  {
    id: 'h3',
    type: 'system',
    title: 'Vendedor alterado',
    timestamp: '03/06/26 19:53',
    byLabel: 'por',
    byName: 'Tatiana',
    detail: 'Nenhum',
    detailBold: 'Maui',
  },
  {
    id: 'h4',
    type: 'lead_created',
    title: 'Lead criado',
    timestamp: '01/06/26 19:05',
    byLabel: 'via',
    byName: 'API/Webhook Facebook',
    source: 'Campanha Consórcio Imobiliário SP',
    detail: null,
    detailBold: null,
  },
]

// ── Helper: parse cota string ──────────────────────────────────────────────────

function parseCota(cota: string): { type: string; value: string } {
  const match = cota.match(/^Cota\s+(R\$[\d\s.,]+)\s*\((.+)\)$/)
  if (match?.[1] && match[2]) return { value: match[1].trim(), type: match[2].trim() }
  return { type: cota, value: '' }
}

// ── LeadModal ──────────────────────────────────────────────────────────────────

export interface LeadModalProps {
  card: CardData
  onClose: () => void
}

export function LeadModal({ card, onClose }: LeadModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const cota = parseCota(card.cota)
  const activeStage = 0 // Lead = índice 0
  const responsible = getAgentProfile(card.agent)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <header className={styles.header}>
          <div className={styles.headerTop}>
            {/* Identidade */}
            <div className={styles.identityArea}>
              <div className={styles.breadcrumb}>
                <span className={styles.breadcrumbLink}>CRM - VENDAS</span>
                <span className={styles.breadcrumbSep}>/</span>
                <span className={styles.breadcrumbLink}>Kanban Consórcio</span>
              </div>
              <div className={styles.leadTitleRow}>
                <h1 className={styles.leadName}>{card.name}</h1>
                <span className={styles.statusBadge}>
                  <span className={styles.statusDot} />
                  Em Aberto
                </span>
                <button type="button" className={styles.stagePill}>
                  <FlagIcon />
                  <span>LEAD</span>
                  <ChevronDownIcon />
                </button>
              </div>
            </div>

            {/* Ações */}
            <div className={styles.headerActions}>
              <button type="button" className={styles.btnSecondary}>
                <TransferIcon />
                Transferir
              </button>
              <button type="button" className={styles.btnDanger}>
                <ThumbsDownIcon />
                Marcar como Perdido
              </button>
              <button type="button" className={styles.btnGanho}>
                <TrophyIcon />
                Marcar como Ganho
              </button>
              <div className={styles.headerDivider} />
              <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fechar ficha do lead">
                <XIcon size={16} />
              </button>
            </div>
          </div>

          {/* Barra de progresso do funil */}
          <div className={styles.funnelBar}>
            <span className={styles.funnelLabel}>Etapas do Funil:</span>
            {FUNNEL_STAGES.map((stage, i) => (
              <span key={stage} className={styles.funnelGroup}>
                <span className={i === activeStage ? styles.funnelStageActive : styles.funnelStage}>
                  {stage}
                </span>
                {i < FUNNEL_STAGES.length - 1 && (
                  <span className={styles.funnelArrow}><ChevronRightIcon /></span>
                )}
              </span>
            ))}
          </div>
        </header>

        {/* ── Workspace ─────────────────────────────────────────────────── */}
        <div className={styles.workspace}>

          {/* Coluna esquerda */}
          <div className={styles.leftCol}>

            {/* Card: Ficha de Qualificação */}
            <div className={styles.card}>
              <div className={styles.cardTabsRow}>
                <div className={styles.tabs}>
                  <button type="button" className={`${styles.tab} ${styles.tabActive}`}>Ficha de Qualificação</button>
                  <button type="button" className={styles.tab}>Anexos</button>
                </div>
                <button type="button" className={styles.editBtn}>
                  <PencilIcon />
                  Editar Atributos
                </button>
              </div>

              {/* Grade de atributos */}
              <div className={styles.attrsGrid}>
                {/* Telefone */}
                <div className={styles.attrCell}>
                  <div className={styles.attrLabel}><PhoneIcon />Telefone / WhatsApp</div>
                  <div className={styles.attrValue}>
                    <span className={styles.attrValueText}>{card.phone}</span>
                    <span className={styles.callBadge}><WhatsAppIcon />Chamar</span>
                  </div>
                </div>

                {/* Responsável */}
                <div className={styles.attrCell}>
                  <div className={styles.attrLabel}><PersonIcon />Responsável</div>
                  <div className={styles.attrValue}>
                    <img src={responsible.photo} alt={responsible.name} className={styles.agentAvatar} />
                    <span className={styles.attrValueText}>{responsible.name}</span>
                    <span className={styles.attrValueMuted}>({responsible.team})</span>
                  </div>
                </div>

                {/* Origem */}
                <div className={styles.attrCell}>
                  <div className={styles.attrLabel}><SignalIcon />Origem do Lead</div>
                  <div className={styles.attrValue}>
                    <span
                      className={styles.sourceBadge}
                      style={{ background: card.sourceBg, color: card.sourceText }}
                    >
                      {card.source}
                    </span>
                    <span className={card.daysUrgent ? styles.daysTagUrgent : styles.daysTagNormal}>
                      {card.days} no funil
                    </span>
                  </div>
                </div>

                {/* Interesse */}
                <div className={styles.attrCell}>
                  <div className={styles.attrLabel}><HomeIcon />Interesse</div>
                  <div className={styles.attrValueCol}>
                    {cota.type && <span className={styles.attrValueBold}>{cota.type}</span>}
                    {cota.value && <span className={styles.attrValueSub}>{cota.value}</span>}
                    {!cota.type && <span className={styles.attrValueBold}>{card.cota}</span>}
                  </div>
                </div>

                {/* Data de Cadastro */}
                <div className={styles.attrCell}>
                  <div className={styles.attrLabel}><CalendarIcon />Data de Cadastro</div>
                  <div className={styles.attrValue}>
                    <span className={styles.attrValueText}>{card.date}</span>
                  </div>
                </div>
              </div>

              <hr className={styles.separator} />

              {/* Observações */}
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Observações de Qualificação (Descoberta)</span>
                <div className={styles.obsBox}>
                  <p className={styles.obsText}>
                    Renda familiar mensal: 3500; sua intenção de compra é em itapevi? sim; Pretende comprar: próximos_4_meses.
                    Lance embutido estimado em 25% com recursos de FGTS previstos para compor oferta no consórcio imobiliário.
                  </p>
                </div>
              </div>

              {/* Tags */}
              <div className={styles.tagsRow}>
                <div className={styles.tagsLabel}><TagIcon />Tags:</div>
                <span className={styles.tag}>#ConsorcioImobiliario</span>
                <span className={styles.tag}>#LeadQuente</span>
                <span className={styles.tag}>#Itapevi</span>
                <button type="button" className={styles.addTagBtn}><PlusIcon />Adicionar Tag</button>
              </div>
            </div>

            {/* Card: Tarefas */}
            <div className={styles.card}>
              <div className={styles.taskHeader}>
                <div>
                  <h2 className={styles.taskTitle}>Tarefas</h2>
                  <p className={styles.taskSubtitle}>
                    Acompanhe contatos telefônicos, envio de simulações e visitas presenciais.
                  </p>
                </div>
                <button type="button" className={styles.newTaskBtn}>
                  <PlusIcon />Nova Tarefa
                </button>
              </div>

              {/* Quick chips */}
              <div className={styles.chipsRow}>
                <span className={styles.chipsLabel}>Criar rápido:</span>
                <button type="button" className={styles.chip}><PhoneIcon />Ligação de Follow-up</button>
                <button type="button" className={styles.chip}><CalendarIcon />Simulação de Lance</button>
                <button type="button" className={styles.chip}><CalendarIcon />Agendar Reunião</button>
              </div>

              {/* Lista de tarefas */}
              <div className={styles.taskList}>
                {MOCK_TASKS.map(task => (
                  <div key={task.id} className={task.urgent ? styles.taskItemUrgent : styles.taskItem}>
                    <div className={styles.taskLeft}>
                      <div className={styles.taskCheckbox} role="checkbox" aria-checked="false" aria-label="Concluir tarefa" />
                      <div className={styles.taskContent}>
                        <span className={styles.taskItemTitle}>{task.title}</span>
                        <div className={styles.taskMeta}>
                          <span className={task.dueUrgent ? styles.taskTimeUrgent : styles.taskTime}>
                            <ClockIcon />{task.dueLabel}
                          </span>
                          <span className={styles.taskMetaDot}>•</span>
                          <span className={styles.taskMetaText}>Resp: {task.responsible}</span>
                          {task.channel && (
                            <>
                              <span className={styles.taskMetaDot}>•</span>
                              <span className={styles.taskChannel}>{task.channel}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={styles.taskRight}>
                      <span className={task.urgent ? styles.priorityBadgeUrgent : styles.priorityBadgeNormal}>
                        {task.priority}
                      </span>
                      <button type="button" className={styles.taskMenuBtn} aria-label="Opções da tarefa">
                        <DotsIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna direita — Histórico */}
          <div className={styles.rightCol}>
            <div className={styles.historyCard}>
              {/* Header do histórico */}
              <div className={styles.historyHeader}>
                <div className={styles.historyHeaderLeft}>
                  <h2 className={styles.historyTitle}>Histórico</h2>
                  <span className={styles.historyCount}>{MOCK_HISTORY.length}</span>
                </div>
                <div className={styles.historyActions}>
                  <button type="button" className={styles.historyActionBtn} aria-label="Pesquisar"><SearchIcon /></button>
                  <button type="button" className={styles.historyActionBtn} aria-label="Filtrar"><FilterIcon /></button>
                </div>
              </div>

              {/* Filtros */}
              <div className={styles.historyFilters}>
                <button type="button" className={styles.filterPillActive}>Tudo</button>
                <button type="button" className={styles.filterPill}>Comentários</button>
                <button type="button" className={styles.filterPill}>Sistema</button>
                <button type="button" className={styles.filterPill}>WhatsApp</button>
              </div>

              {/* Timeline */}
              <div className={styles.timeline}>
                {MOCK_HISTORY.map((event, i) => (
                  <div key={event.id} className={styles.timelineEvent}>
                    <div className={styles.timelineLeft}>
                      <div className={
                        event.type === 'whatsapp'
                          ? `${styles.timelineIcon} ${styles.timelineIconWa}`
                          : event.type === 'lead_created'
                            ? `${styles.timelineIcon} ${styles.timelineIconCreated}`
                            : `${styles.timelineIcon} ${styles.timelineIconSystem}`
                      }>
                        {event.type === 'whatsapp' && <WhatsAppIcon size={12} />}
                        {event.type === 'system' && <LightningIcon />}
                        {event.type === 'lead_created' && <CheckIcon />}
                      </div>
                      {i < MOCK_HISTORY.length - 1 && <div className={styles.timelineConnector} />}
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineRow}>
                        <span className={
                          event.type === 'whatsapp'
                            ? `${styles.timelineTitle} ${styles.timelineTitleWa}`
                            : styles.timelineTitle
                        }>
                          {event.title}
                        </span>
                        <span className={styles.timelineDate}>{event.timestamp}</span>
                      </div>

                      {event.byLabel && event.byName && (
                        <p className={styles.timelineBody}>
                          {event.byLabel}{' '}
                          <strong className={styles.timelineBold}>{event.byName}</strong>
                        </p>
                      )}

                      {event.type === 'whatsapp' && event.message && (
                        <div className={styles.timelineWaMsg}>{event.message}</div>
                      )}

                      {event.type !== 'whatsapp' && event.detail && event.detailBold && (
                        <div className={styles.timelineDetail}>
                          {event.detail} → <strong className={styles.timelineBold}>{event.detailBold}</strong>
                        </div>
                      )}

                      {'source' in event && event.source && (
                        <div className={styles.timelineSource}>
                          <TagIcon />
                          Origem: {event.source}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input de comentário */}
              <div className={styles.commentInput}>
                <img src={responsible.photo} alt={responsible.name} className={styles.commentAvatar} />
                <input
                  type="text"
                  placeholder="Adicionar comentário ou nota interna..."
                  className={styles.commentField}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
