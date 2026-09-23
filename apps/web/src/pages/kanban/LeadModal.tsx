// LeadModal — ficha completa do lead, aberta ao clicar em um card do Kanban.
// Design: Figma SYLOAPP node 276:590

import { Skeleton, useToast } from '@sylocrm/ui'
import { useEffect, useRef, useState } from 'react'
import { COLUMN_META, type CardData } from '../../data/kanban-mock'
import { useDeleteLead, useUpdateLead } from '../../hooks/useLeads'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useOrganizationSettingsQuery } from '../../hooks/useOrganizationSettings'
import { useTeamMembersQuery } from '../../hooks/useTeam'
import { COLUMN_ID_TO_STAGE, STAGE_TO_COLUMN_ID, resolveAgent } from '../../lib/lead-adapters'
import type { OutcomeFilter } from '../../lib/leads-api'
import styles from './LeadModal.module.css'

// ── Ícones (SVG inline — padrão do projeto) ────────────────────────────────────

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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

function FlagIcon() {
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
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
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

function ChevronRightIcon() {
  return (
    <svg
      width="7"
      height="7"
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

function WhatsAppIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg
      width="9"
      height="9"
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

function SignalIcon() {
  return (
    <svg
      width="12"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function HomeIcon() {
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
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
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

function TagIcon() {
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
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function PlusIcon() {
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
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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

function DotsIcon() {
  return (
    <svg width="3" height="13" viewBox="0 0 3 13" fill="currentColor" aria-hidden="true">
      <circle cx="1.5" cy="1.5" r="1.5" />
      <circle cx="1.5" cy="6.5" r="1.5" />
      <circle cx="1.5" cy="11.5" r="1.5" />
    </svg>
  )
}

function TransferIcon() {
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
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function ThumbsDownIcon() {
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
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z" />
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  )
}

function TrashIcon() {
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
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function RefreshIcon() {
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
      <path d="M3 12a9 9 0 0 1 15.36-6.36L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.36 6.36L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

function TrophyIcon() {
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
      <polyline points="8 21 12 17 16 21" />
      <line x1="12" y1="17" x2="12" y2="11" />
      <path d="M7 4h10M17 4c0 0 0 8-5 8S7 4 7 4" />
      <path d="M6 4c-2 0-4 1-4 4 0 3 2 4 4 4M18 4c2 0 4 1 4 4 0 3-2 4-4 4" />
    </svg>
  )
}

function LightningIcon() {
  return (
    <svg
      width="8"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function SearchIcon() {
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg
      width="13"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  )
}

function PdfIcon() {
  return (
    <svg
      width="10"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg
      width="13"
      height="7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

// ADMIN_USER e getAgentProfile importados de ../../data/kanban-mock

// ── Dados estáticos (mock) ─────────────────────────────────────────────────────

// Mesmas 6 etapas e ordem do board (COLUMN_META) — nunca hardcoded aqui de
// novo, senão volta a divergir do funil real (bug: essa lista tinha nomes
// que nem existem nas colunas de verdade, tipo "Agendamento").
const FUNNEL_STAGES = COLUMN_META.map((column) => column.name)

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
    message:
      '"Olá Aparecido! Notamos seu interesse no consórcio de R$ 350 mil do Parque do Sol. Preparamos 3 lances simulados para você..."',
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
  outcome: OutcomeFilter
  onClose: () => void
  /** Quando true, exibe skeleton no workspace — para quando os dados vierem de API real */
  isLoading?: boolean
}

export function LeadModal({ card, outcome, onClose, isLoading = false }: LeadModalProps) {
  const [comment, setComment] = useState('')
  const [localComments, setLocalComments] = useState<{ id: string; text: string }[]>([])
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [addingTag, setAddingTag] = useState(false)
  const tagPickerRef = useRef<HTMLDivElement>(null)

  const { organizationId, membership } = useActiveOrganization()
  const { data: teamData } = useTeamMembersQuery(organizationId)
  const members = teamData?.members ?? []
  const { data: settingsData } = useOrganizationSettingsQuery(organizationId)
  const availableTags = (settingsData?.organization.leadTags ?? []).filter(
    (tag) => !card.tags.includes(tag),
  )
  const updateLead = useUpdateLead(organizationId)
  const deleteLead = useDeleteLead(organizationId)
  const { toast } = useToast()

  const canAssign = membership?.permissions.includes('lead.assign') ?? false
  const canManageLost = membership?.permissions.includes('lead.manage_lost') ?? false
  const isViewingLost = outcome === 'perdido'
  const canDelete = membership?.permissions.includes('lead.delete') ?? false

  function handleReassign(userId: string) {
    updateLead.mutate(
      { id: card.id, payload: { assignedUserId: userId || null } },
      {
        onError: (error) => {
          toast({
            type: 'error',
            title: 'Não foi possível reatribuir o lead',
            description: error instanceof Error ? error.message : undefined,
          })
        },
      },
    )
  }

  function handleStageClick(columnId: string) {
    const stage = COLUMN_ID_TO_STAGE[columnId]
    if (!stage || stage === card.stage) return
    updateLead.mutate(
      { id: card.id, payload: { stage } },
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

  function handleMarkWon() {
    updateLead.mutate(
      { id: card.id, payload: { stage: 'VENDA' } },
      {
        onSuccess: () => toast({ type: 'success', title: 'Lead marcado como ganho!' }),
        onError: (error) => {
          toast({
            type: 'error',
            title: 'Não foi possível marcar como ganho',
            description: error instanceof Error ? error.message : undefined,
          })
        },
      },
    )
  }

  function handleMarkLost() {
    updateLead.mutate(
      { id: card.id, payload: { lost: true } },
      {
        onSuccess: () => {
          toast({ type: 'success', title: 'Lead marcado como perdido' })
          onClose()
        },
        onError: (error) => {
          toast({
            type: 'error',
            title: 'Não foi possível marcar como perdido',
            description: error instanceof Error ? error.message : undefined,
          })
        },
      },
    )
  }

  function handleAddTag(tag: string) {
    setAddingTag(false)
    updateLead.mutate(
      { id: card.id, payload: { tags: [...card.tags, tag] } },
      {
        onError: (error) => {
          toast({
            type: 'error',
            title: 'Não foi possível adicionar a tag',
            description: error instanceof Error ? error.message : undefined,
          })
        },
      },
    )
  }

  function handleRemoveTag(tag: string) {
    updateLead.mutate(
      { id: card.id, payload: { tags: card.tags.filter((t) => t !== tag) } },
      {
        onError: (error) => {
          toast({
            type: 'error',
            title: 'Não foi possível remover a tag',
            description: error instanceof Error ? error.message : undefined,
          })
        },
      },
    )
  }

  function handleReopenLead() {
    updateLead.mutate(
      { id: card.id, payload: { lost: false } },
      {
        onSuccess: () => {
          toast({ type: 'success', title: 'Lead reaberto' })
          onClose()
        },
        onError: (error) => {
          toast({
            type: 'error',
            title: 'Não foi possível reabrir o lead',
            description: error instanceof Error ? error.message : undefined,
          })
        },
      },
    )
  }

  function handleConfirmDelete() {
    deleteLead.mutate(card.id, {
      onSuccess: () => {
        toast({ type: 'success', title: 'Lead excluído' })
        onClose()
      },
      onError: (error) => {
        toast({
          type: 'error',
          title: 'Não foi possível excluir o lead',
          description: error instanceof Error ? error.message : undefined,
        })
        setConfirmingDelete(false)
      },
    })
  }

  function submitComment() {
    const trimmed = comment.trim()
    if (!trimmed) return
    setLocalComments((prev) => [{ id: crypto.randomUUID(), text: trimmed }, ...prev])
    setComment('')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!addingTag) return
    function handler(e: MouseEvent) {
      if (!tagPickerRef.current?.contains(e.target as Node)) setAddingTag(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [addingTag])

  const [activeTab, setActiveTab] = useState<'qualificacao' | 'simulacoes' | 'anexos'>(
    'qualificacao',
  )
  const cota = parseCota(card.cota)
  // Índice real da etapa do lead — antes ficava travado em "Lead" (0)
  // independente da etapa de verdade.
  const activeStageIndex = COLUMN_META.findIndex(
    (column) => column.id === STAGE_TO_COLUMN_ID[card.stage],
  )
  const activeStage = activeStageIndex === -1 ? 0 : activeStageIndex
  const responsible = resolveAgent(card.assignedUserId, members)

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
      role="presentation"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
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
              {isViewingLost ? (
                canManageLost && (
                  <button
                    type="button"
                    className={styles.btnGanho}
                    onClick={handleReopenLead}
                    disabled={updateLead.isPending}
                  >
                    <RefreshIcon />
                    Reabrir Lead
                  </button>
                )
              ) : (
                <>
                  <button type="button" className={styles.btnSecondary}>
                    <TransferIcon />
                    Transferir
                  </button>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={handleMarkLost}
                    disabled={updateLead.isPending}
                  >
                    <ThumbsDownIcon />
                    Marcar como Perdido
                  </button>
                  {card.stage === 'FECHADO' && (
                    <button
                      type="button"
                      className={styles.btnGanho}
                      onClick={handleMarkWon}
                      disabled={updateLead.isPending}
                    >
                      <TrophyIcon />
                      Marcar como Ganho
                    </button>
                  )}
                </>
              )}
              {canDelete && (
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={() => setConfirmingDelete(true)}
                >
                  <TrashIcon />
                  Excluir Lead
                </button>
              )}
              <div className={styles.headerDivider} />
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Fechar ficha do lead"
              >
                <XIcon size={16} />
              </button>
            </div>
          </div>

          {/* Barra de progresso do funil */}
          <div className={styles.funnelBar}>
            <span className={styles.funnelLabel}>Etapas do Funil:</span>
            {FUNNEL_STAGES.map((stage, i) => {
              // "Venda Concluída" só é alcançável a partir de Fechado — mesma
              // regra que o backend aplica (UpdateLeadUseCase).
              const isUnreachableVenda = COLUMN_META[i]?.id === 'venda' && card.stage !== 'FECHADO'
              return (
                <span key={stage} className={styles.funnelGroup}>
                  <button
                    type="button"
                    className={i === activeStage ? styles.funnelStageActive : styles.funnelStage}
                    onClick={() => handleStageClick(COLUMN_META[i]?.id ?? '')}
                    disabled={updateLead.isPending || isUnreachableVenda}
                    title={
                      isUnreachableVenda
                        ? 'Só é possível marcar como Ganho a partir da etapa Fechado.'
                        : undefined
                    }
                  >
                    {stage}
                  </button>
                  {i < FUNNEL_STAGES.length - 1 && (
                    <span className={styles.funnelArrow}>
                      <ChevronRightIcon />
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        </header>

        {/* ── Skeleton do workspace (API real) ──────────────────────────── */}
        {isLoading && (
          <div className={styles.workspace}>
            <div className={styles.leftCol}>
              {/* Skeleton: card de qualificação */}
              <div className={styles.card}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingBottom: 13,
                    borderBottom: '1px solid rgba(216,195,173,0.2)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Skeleton
                      variant="rect"
                      width="120px"
                      height="30px"
                      style={{ borderRadius: 8 }}
                    />
                    <Skeleton
                      variant="rect"
                      width="80px"
                      height="30px"
                      style={{ borderRadius: 8 }}
                    />
                    <Skeleton
                      variant="rect"
                      width="64px"
                      height="30px"
                      style={{ borderRadius: 8 }}
                    />
                  </div>
                  <Skeleton
                    variant="rect"
                    width="110px"
                    height="28px"
                    style={{ borderRadius: 8 }}
                  />
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '20px 24px',
                    paddingTop: 4,
                  }}
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton array — order never changes
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <Skeleton variant="text" width="70%" height="12px" />
                      <Skeleton variant="text" width="90%" height="16px" />
                    </div>
                  ))}
                </div>
                <Skeleton variant="rect" width="100%" height="1px" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Skeleton variant="text" width="160px" height="12px" />
                  <Skeleton variant="rect" width="100%" height="72px" style={{ borderRadius: 8 }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Skeleton variant="rect" width="36px" height="20px" style={{ borderRadius: 4 }} />
                  <Skeleton
                    variant="rect"
                    width="100px"
                    height="20px"
                    style={{ borderRadius: 4 }}
                  />
                  <Skeleton variant="rect" width="72px" height="20px" style={{ borderRadius: 4 }} />
                </div>
              </div>
              {/* Skeleton: card de tarefas */}
              <div className={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Skeleton variant="text" width="80px" height="18px" />
                    <Skeleton variant="text" width="260px" height="13px" />
                  </div>
                  <Skeleton
                    variant="rect"
                    width="100px"
                    height="34px"
                    style={{ borderRadius: 8 }}
                  />
                </div>
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton array — order never changes
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: 15,
                      background: '#f8f9ff',
                      borderRadius: 8,
                      border: '1px solid rgba(216,195,173,0.3)',
                    }}
                  >
                    <Skeleton
                      variant="rect"
                      width="16px"
                      height="16px"
                      style={{ borderRadius: 4, flexShrink: 0, marginTop: 2 }}
                    />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <Skeleton variant="text" width="85%" height="14px" />
                      <Skeleton variant="text" width="55%" height="12px" />
                    </div>
                    <Skeleton
                      variant="rect"
                      width="70px"
                      height="20px"
                      style={{ borderRadius: 4 }}
                    />
                  </div>
                ))}
              </div>
            </div>
            {/* Skeleton: histórico */}
            <div className={styles.rightCol}>
              <div className={styles.historyCard}>
                <div className={styles.historyHeader}>
                  <Skeleton variant="text" width="80px" height="16px" />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Skeleton
                      variant="rect"
                      width="30px"
                      height="30px"
                      style={{ borderRadius: 8 }}
                    />
                    <Skeleton
                      variant="rect"
                      width="30px"
                      height="30px"
                      style={{ borderRadius: 8 }}
                    />
                  </div>
                </div>
                <div className={styles.timeline}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton array — order never changes
                    <div key={i} className={styles.timelineEvent}>
                      <div className={styles.timelineLeft}>
                        <Skeleton variant="circle" width="28px" height="28px" />
                        {i < 2 && <div className={styles.timelineConnector} />}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Skeleton variant="text" width="55%" height="13px" />
                          <Skeleton variant="text" width="25%" height="12px" />
                        </div>
                        <Skeleton variant="text" width="40%" height="12px" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.commentInput}>
                  <Skeleton variant="circle" width="28px" height="28px" />
                  <Skeleton variant="rect" style={{ flex: 1, borderRadius: 8 }} height="36px" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Workspace ─────────────────────────────────────────────────── */}
        {!isLoading && (
          <div className={styles.workspace}>
            {/* Coluna esquerda */}
            <div className={styles.leftCol}>
              {/* Card: Ficha de Qualificação */}
              <div className={styles.card}>
                <div className={styles.cardTabsRow}>
                  <div className={styles.tabs}>
                    <button
                      type="button"
                      className={
                        activeTab === 'qualificacao'
                          ? `${styles.tab} ${styles.tabActive}`
                          : styles.tab
                      }
                      onClick={() => setActiveTab('qualificacao')}
                    >
                      Ficha de Qualificação
                    </button>
                    <button
                      type="button"
                      className={
                        activeTab === 'simulacoes'
                          ? `${styles.tab} ${styles.tabActive}`
                          : styles.tab
                      }
                      onClick={() => setActiveTab('simulacoes')}
                    >
                      Simulações
                    </button>
                    <button
                      type="button"
                      className={
                        activeTab === 'anexos' ? `${styles.tab} ${styles.tabActive}` : styles.tab
                      }
                      onClick={() => setActiveTab('anexos')}
                    >
                      Anexos
                    </button>
                  </div>
                  {activeTab === 'qualificacao' && (
                    <button type="button" className={styles.editBtn}>
                      <PencilIcon />
                      Editar Atributos
                    </button>
                  )}
                  {activeTab === 'simulacoes' && (
                    <button type="button" className={styles.novaSimBtn}>
                      <LightningIcon />
                      Nova Simulação
                    </button>
                  )}
                </div>

                {/* ── Aba: Simulações ─────────────────────────────────── */}
                {activeTab === 'simulacoes' && (
                  <div className={styles.simList}>
                    {/* Simulação Principal */}
                    <div className={styles.simCardMain}>
                      <div className={styles.simTopRow}>
                        <span className={styles.propPrincipalBadge}>
                          <span className={styles.propDot} />
                          Proposta Principal
                        </span>
                        <div className={styles.simMeta}>
                          <span>
                            Grupo: <strong>7829</strong>
                          </span>
                          <span className={styles.simMetaDot}>•</span>
                          <span>
                            Cota: <strong>104</strong>
                          </span>
                          <span className={styles.simMetaDot}>•</span>
                          <span>Porthis Consórcio</span>
                        </div>
                      </div>

                      <div className={styles.simHeader}>
                        <div>
                          <h3 className={styles.simTitle}>Cota Imobiliária Porto Seguro</h3>
                          <p className={styles.simValue}>R$ 350.000,00</p>
                        </div>
                        <div className={styles.simParcelGroup}>
                          <span className={styles.simParcelLabel}>
                            Parcela Reduzida (50% até contemplação)
                          </span>
                          <div className={styles.simParcelValue}>
                            <span className={styles.simParcelAmount}>R$ 1.205,55</span>
                            <span className={styles.simParcelPer}>/mês</span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.simMetrics}>
                        <div className={styles.simMetricItem}>
                          <span className={styles.simMetricLabel}>Crédito Contratado</span>
                          <span className={styles.simMetricValue}>R$ 350.000,00</span>
                          <span className={styles.simMetricSub}>Fundo Reserva: 2%</span>
                        </div>
                        <div className={`${styles.simMetricItem} ${styles.simMetricBorder}`}>
                          <span className={styles.simMetricLabel}>Prazo Total</span>
                          <span className={styles.simMetricValue}>180 meses</span>
                          <span className={`${styles.simMetricSub} ${styles.simMetricSubGreen}`}>
                            15 anos planejados
                          </span>
                        </div>
                        <div className={`${styles.simMetricItem} ${styles.simMetricBorder}`}>
                          <span className={styles.simMetricLabel}>Taxa Adm. Diluída</span>
                          <span className={styles.simMetricValue}>15% total</span>
                          <span className={styles.simMetricSub}>0,083% a.m. (sem juros)</span>
                        </div>
                        <div className={`${styles.simMetricItem} ${styles.simMetricBorder}`}>
                          <span className={styles.simMetricLabel}>Assembleia Próxima</span>
                          <span className={styles.simMetricValue}>18/06/2026</span>
                          <span className={styles.simMetricSub}>Dia útil do sorteio</span>
                        </div>
                      </div>

                      <div className={styles.simActions}>
                        <button type="button" className={styles.pdfBtn}>
                          <PdfIcon />
                          Gerar PDF para WhatsApp
                        </button>
                        <div className={styles.simSecActions}>
                          <button type="button" className={styles.simSecBtn}>
                            <LinkIcon />
                            Copiar Link
                          </button>
                          <button type="button" className={styles.simSecBtn}>
                            <PencilIcon />
                            Editar Parâmetros
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Simulação Secundária */}
                    <div className={styles.simCardSec}>
                      <div className={styles.simSecTopRow}>
                        <div className={styles.simSecLeft}>
                          <span className={styles.cenarioBadge}>Cenário Secundário</span>
                          <h4 className={styles.simSecTitle}>
                            Cota Imobiliária Caixa Consórcios — R$ 300.000,00
                          </h4>
                        </div>
                        <div className={styles.simSecButtons}>
                          <button type="button" className={styles.verDetalhesBtn}>
                            Ver Detalhes
                          </button>
                          <button type="button" className={styles.descartarBtn}>
                            Descartar
                          </button>
                        </div>
                      </div>

                      <div className={styles.simSecMetrics}>
                        <div className={styles.simSecMetricItem}>
                          <span className={styles.simMetricLabel}>Prazo Total</span>
                          <span className={styles.simSecMetricValue}>200 meses</span>
                        </div>
                        <div className={styles.simSecMetricItem}>
                          <span className={styles.simMetricLabel}>Parcela Mensal</span>
                          <span className={styles.simSecMetricValue}>R$ 1.875,00 /mês</span>
                        </div>
                        <div className={styles.simSecMetricItem}>
                          <span className={styles.simMetricLabel}>Lance Livre Recomendado</span>
                          <span className={styles.simSecMetricValue}>35% (R$ 105.000)</span>
                        </div>
                        <div className={styles.simSecMetricItem}>
                          <span className={styles.simMetricLabel}>Probabilidade Sara</span>
                          <div className={styles.saraProb}>
                            <SignalIcon />
                            <span className={styles.simSecMetricValue}>62% (Média)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Simular Novo Cenário */}
                    <div className={styles.simNewBlock}>
                      <div className={styles.simNewHeader}>
                        <div className={styles.simNewIcon}>
                          <LightningIcon />
                        </div>
                        <div>
                          <h4 className={styles.simNewTitle}>Simular Novo Cenário</h4>
                          <p className={styles.simNewSub}>
                            Preencha os parâmetros para calcular lances médios contemplados dos
                            últimos 6 meses.
                          </p>
                        </div>
                      </div>
                      <div className={styles.simForm}>
                        <div className={styles.simFormField}>
                          <label className={styles.simFormLabel} htmlFor="sim-credito">
                            Crédito Pretendido (R$)
                          </label>
                          <input
                            id="sim-credito"
                            type="text"
                            className={styles.simInput}
                            defaultValue="R$ 400.000,00"
                          />
                        </div>
                        <div className={styles.simFormField}>
                          <label className={styles.simFormLabel} htmlFor="sim-tipo">
                            Tipo do Consórcio
                          </label>
                          <select id="sim-tipo" className={styles.simSelect}>
                            <option>Imóvel Residencial</option>
                            <option>Automóvel</option>
                            <option>Pesado / Caminhão</option>
                          </select>
                        </div>
                        <div className={styles.simFormField}>
                          <label className={styles.simFormLabel} htmlFor="sim-prazo">
                            Prazo Desejado
                          </label>
                          <select id="sim-prazo" className={styles.simSelect}>
                            <option>180 meses (15 anos)</option>
                            <option>120 meses (10 anos)</option>
                            <option>200 meses</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Aba: Qualificação ────────────────────────────────── */}
                {activeTab === 'qualificacao' && (
                  <>
                    {/* Grade de atributos */}
                    <div className={styles.attrsGrid}>
                      {/* Telefone */}
                      <div className={styles.attrCell}>
                        <div className={styles.attrLabel}>
                          <PhoneIcon />
                          Telefone / WhatsApp
                        </div>
                        <div className={styles.attrValue}>
                          <span className={styles.attrValueText}>{card.phone}</span>
                          <span className={styles.callBadge}>
                            <WhatsAppIcon />
                            Chamar
                          </span>
                        </div>
                      </div>

                      {/* Responsável */}
                      <div className={styles.attrCell}>
                        <div className={styles.attrLabel}>
                          <PersonIcon />
                          Responsável
                        </div>
                        <div className={styles.attrValue}>
                          <img
                            src={responsible.photo}
                            alt={responsible.name}
                            className={styles.agentAvatar}
                          />
                          {canAssign ? (
                            <select
                              value={card.assignedUserId ?? ''}
                              onChange={(e) => handleReassign(e.target.value)}
                              disabled={updateLead.isPending}
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                padding: '4px 8px',
                                borderRadius: 6,
                                border: '1px solid var(--color-border, #e2e8f0)',
                              }}
                            >
                              <option value="">Não atribuído</option>
                              {members.map((member) => (
                                <option key={member.userId} value={member.userId}>
                                  {member.name ?? member.email}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <>
                              <span className={styles.attrValueText}>{responsible.name}</span>
                              {responsible.roleLabel && (
                                <span className={styles.attrValueMuted}>
                                  ({responsible.roleLabel})
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Origem */}
                      <div className={styles.attrCell}>
                        <div className={styles.attrLabel}>
                          <SignalIcon />
                          Origem do Lead
                        </div>
                        <div className={styles.attrValue}>
                          <span
                            className={styles.sourceBadge}
                            style={{ background: card.sourceBg, color: card.sourceText }}
                          >
                            {card.source}
                          </span>
                          <span
                            className={
                              card.daysUrgent ? styles.daysTagUrgent : styles.daysTagNormal
                            }
                          >
                            {card.days} no estágio
                          </span>
                        </div>
                      </div>

                      {/* Interesse */}
                      <div className={styles.attrCell}>
                        <div className={styles.attrLabel}>
                          <HomeIcon />
                          Interesse
                        </div>
                        <div className={styles.attrValueCol}>
                          {cota.type && <span className={styles.attrValueBold}>{cota.type}</span>}
                          {cota.value && <span className={styles.attrValueSub}>{cota.value}</span>}
                          {!cota.type && <span className={styles.attrValueBold}>{card.cota}</span>}
                        </div>
                      </div>

                      {/* Data de Cadastro */}
                      <div className={styles.attrCell}>
                        <div className={styles.attrLabel}>
                          <CalendarIcon />
                          Data de Cadastro
                        </div>
                        <div className={styles.attrValue}>
                          <span className={styles.attrValueText}>{card.date}</span>
                        </div>
                      </div>
                    </div>

                    <hr className={styles.separator} />

                    {/* Observações */}
                    <div className={styles.section}>
                      <span className={styles.sectionLabel}>Observações</span>
                      <div className={styles.obsBox}>
                        <p className={styles.obsText}>
                          {card.notes?.trim() || 'Nenhuma observação registrada.'}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className={styles.tagsRow}>
                      <div className={styles.tagsLabel}>
                        <TagIcon />
                        Tags:
                      </div>
                      {card.tags.map((tag) => (
                        <span key={tag} className={styles.tag}>
                          {tag}
                          <button
                            type="button"
                            className={styles.tagRemove}
                            onClick={() => handleRemoveTag(tag)}
                            disabled={updateLead.isPending}
                            aria-label={`Remover tag ${tag}`}
                          >
                            <XIcon size={9} />
                          </button>
                        </span>
                      ))}
                      <div className={styles.tagPickerWrapper} ref={tagPickerRef}>
                        <button
                          type="button"
                          className={styles.addTagBtn}
                          onClick={() => setAddingTag((v) => !v)}
                        >
                          <PlusIcon />
                          Adicionar Tag
                        </button>
                        {addingTag && (
                          <div className={styles.tagPickerPanel}>
                            {availableTags.length === 0 ? (
                              <p className={styles.tagPickerEmpty}>
                                {settingsData?.organization.leadTags.length
                                  ? 'Todas as tags já foram adicionadas.'
                                  : 'Nenhuma tag cadastrada. Configure em Configurações → Organização.'}
                              </p>
                            ) : (
                              availableTags.map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  className={styles.tagPickerItem}
                                  onClick={() => handleAddTag(tag)}
                                >
                                  {tag}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
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
                    <PlusIcon />
                    Nova Tarefa
                  </button>
                </div>

                {/* Quick chips */}
                <div className={styles.chipsRow}>
                  <span className={styles.chipsLabel}>Criar rápido:</span>
                  <button type="button" className={styles.chip}>
                    <PhoneIcon />
                    Ligação de Follow-up
                  </button>
                  <button type="button" className={styles.chip}>
                    <CalendarIcon />
                    Simulação de Lance
                  </button>
                  <button type="button" className={styles.chip}>
                    <CalendarIcon />
                    Agendar Reunião
                  </button>
                </div>

                {/* Lista de tarefas */}
                <div className={styles.taskList}>
                  {MOCK_TASKS.map((task) => (
                    <div
                      key={task.id}
                      className={task.urgent ? styles.taskItemUrgent : styles.taskItem}
                    >
                      <div className={styles.taskLeft}>
                        <div
                          className={styles.taskCheckbox}
                          role="checkbox"
                          aria-checked="false"
                          aria-label="Concluir tarefa"
                          tabIndex={0}
                        />
                        <div className={styles.taskContent}>
                          <span className={styles.taskItemTitle}>{task.title}</span>
                          <div className={styles.taskMeta}>
                            <span
                              className={task.dueUrgent ? styles.taskTimeUrgent : styles.taskTime}
                            >
                              <ClockIcon />
                              {task.dueLabel}
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
                        <span
                          className={
                            task.urgent ? styles.priorityBadgeUrgent : styles.priorityBadgeNormal
                          }
                        >
                          {task.priority}
                        </span>
                        <button
                          type="button"
                          className={styles.taskMenuBtn}
                          aria-label="Opções da tarefa"
                        >
                          <DotsIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Coluna direita — Histórico (conteúdo real) */}
            <div className={styles.rightCol}>
              <div className={styles.historyCard}>
                {/* Header do histórico */}
                <div className={styles.historyHeader}>
                  <div className={styles.historyHeaderLeft}>
                    <h2 className={styles.historyTitle}>Histórico</h2>
                    <span className={styles.historyCount}>{MOCK_HISTORY.length}</span>
                  </div>
                  <div className={styles.historyActions}>
                    <button
                      type="button"
                      className={styles.historyActionBtn}
                      aria-label="Pesquisar"
                    >
                      <SearchIcon />
                    </button>
                    <button type="button" className={styles.historyActionBtn} aria-label="Filtrar">
                      <FilterIcon />
                    </button>
                  </div>
                </div>

                {/* Filtros */}
                <div className={styles.historyFilters}>
                  <button type="button" className={styles.filterPillActive}>
                    Tudo
                  </button>
                  <button type="button" className={styles.filterPill}>
                    Comentários
                  </button>
                  <button type="button" className={styles.filterPill}>
                    Sistema
                  </button>
                  <button type="button" className={styles.filterPill}>
                    WhatsApp
                  </button>
                </div>

                {/* Timeline */}
                <div className={styles.timeline}>
                  {MOCK_HISTORY.map((event, i) => (
                    <div key={event.id} className={styles.timelineEvent}>
                      <div className={styles.timelineLeft}>
                        <div
                          className={
                            event.type === 'whatsapp'
                              ? `${styles.timelineIcon} ${styles.timelineIconWa}`
                              : event.type === 'lead_created'
                                ? `${styles.timelineIcon} ${styles.timelineIconCreated}`
                                : `${styles.timelineIcon} ${styles.timelineIconSystem}`
                          }
                        >
                          {event.type === 'whatsapp' && <WhatsAppIcon size={12} />}
                          {event.type === 'system' && <LightningIcon />}
                          {event.type === 'lead_created' && <CheckIcon />}
                        </div>
                        {i < MOCK_HISTORY.length - 1 && (
                          <div className={styles.timelineConnector} />
                        )}
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineRow}>
                          <span
                            className={
                              event.type === 'whatsapp'
                                ? `${styles.timelineTitle} ${styles.timelineTitleWa}`
                                : styles.timelineTitle
                            }
                          >
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
                            {event.detail} →{' '}
                            <strong className={styles.timelineBold}>{event.detailBold}</strong>
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
                {localComments.length > 0 && (
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}
                  >
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
                  <img
                    src={responsible.photo}
                    alt={responsible.name}
                    className={styles.commentAvatar}
                  />
                  <input
                    type="text"
                    placeholder="Adicionar comentário ou nota interna..."
                    className={styles.commentField}
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
                      height: 32,
                    }}
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {confirmingDelete && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop dismiss
        <div
          onClick={() => setConfirmingDelete(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal stops propagation */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 360,
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Excluir lead</h2>
            <p style={{ fontSize: 14, color: '#475569', margin: '0 0 20px' }}>
              Tem certeza que deseja excluir <strong>{card.name}</strong>? Essa ação não pode ser
              desfeita.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLead.isPending}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {deleteLead.isPending ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
