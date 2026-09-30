// LeadModal — ficha completa do lead, aberta ao clicar em um card do Kanban.
// Design: Figma SYLOAPP node 276:590

import { Dropdown, Skeleton, useToast } from '@sylocrm/ui'
import { useEffect, useRef, useState } from 'react'
import type { CardData } from '../../data/kanban-mock'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import {
  useCreateLeadComment,
  useCreateLeadProposal,
  useDeleteLead,
  useDuplicateLead,
  useLeadHistoryQuery,
  useLeadProposalsQuery,
  useShareLeadProposal,
  useUpdateLead,
} from '../../hooks/useLeads'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useOrganizationSettingsQuery } from '../../hooks/useOrganizationSettings'
import { useCreateTask, useDeleteTask, useTasksQuery, useUpdateTask } from '../../hooks/useTasks'
import { useTeamMembersQuery } from '../../hooks/useTeam'
import type { Funnel } from '../../lib/funnels-api'
import {
  centsToMoneyInput,
  formatBRL,
  formatCPF,
  formatMoneyInput,
  formatPhoneBR,
  parseValueToCents,
  resolveAgent,
  resolveCardOutcome,
} from '../../lib/lead-adapters'
import {
  type CreateLeadProposalPayload,
  type LeadHistory,
  type LeadProposal,
  proposalShareUrl,
} from '../../lib/leads-api'
import {
  EMPTY_INSTALLMENT_ROW,
  type InstallmentRow,
  buildInstallmentRanges,
  describeInstallments,
  installmentRowStarts,
} from '../../lib/proposal-installments'
import { downloadProposalPdf } from '../../lib/proposal-pdf'
import { describeProposalViews } from '../../lib/proposal-share'
import type { CreateTaskPayload, Task, TaskType, UpdateTaskPayload } from '../../lib/tasks-api'
import type { TeamMember } from '../../lib/team-api'
import { TaskFormModal } from '../tarefas/TaskFormModal'
import { TaskModal } from '../tarefas/TaskModal'
import {
  TYPE_BADGES as TASK_TYPE_BADGES,
  displayStatus,
  formatTaskDateTime,
} from '../tarefas/tarefas.types'
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

function MailIcon() {
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
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="M22 6l-10 7L2 6" />
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

function CurrencyIcon() {
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
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function IdCardIcon() {
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
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <circle cx="8" cy="11" r="2" />
      <line x1="6" y1="16" x2="10" y2="16" />
      <line x1="14" y1="9" x2="19" y2="9" />
      <line x1="14" y1="13" x2="19" y2="13" />
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

function DownloadIcon() {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function LinkIcon() {
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
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function CommentIcon() {
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
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
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

// ADMIN_USER e getAgentProfile importados de ../../data/kanban-mock

// ── Feed de histórico (atribuição real + comentários reais) ────────────────────
//
// "WhatsApp" continua como aba de filtro na UI, mas não tem fonte de dado real
// hoje (não existe integração de envio de mensagens) — fica sempre vazia.

type HistoryTab = 'todos' | 'comentarios' | 'sistema' | 'whatsapp'

const HISTORY_TAB_LABEL: Record<HistoryTab, string> = {
  todos: 'Tudo',
  comentarios: 'Comentários',
  sistema: 'Sistema',
  whatsapp: 'WhatsApp',
}

interface FeedItem {
  id: string
  kind: 'created' | 'assignment' | 'comment' | 'proposal'
  timestamp: string
  source?: string
  changedByName?: string
  fromName?: string
  toName?: string
  authorName?: string
  text?: string
}

/** Resumo da proposta no histórico: "Entrada R$ 20.000 · 24x · Tabela X". */
function describeProposalForHistory(proposal: LeadProposal): string {
  const parts = [`Entrada R$ ${formatBRL(proposal.downPaymentCents)}`, `${proposal.termMonths}x`]
  if (proposal.tableName) parts.push(proposal.tableName)
  return parts.join(' · ')
}

function buildHistoryFeed(
  card: CardData,
  history: LeadHistory | undefined,
  proposals: LeadProposal[] | undefined,
  members: TeamMember[] | undefined,
  currentUserId: string | undefined,
): FeedItem[] {
  const items: FeedItem[] = [
    { id: 'created', kind: 'created', timestamp: card.createdAt, source: card.source },
  ]

  for (const change of history?.assignmentHistory ?? []) {
    items.push({
      id: change.id,
      kind: 'assignment',
      timestamp: change.changedAt,
      changedByName: resolveAgent(change.changedByUserId, members).name,
      fromName: resolveAgent(change.fromUserId, members).name,
      toName: resolveAgent(change.toUserId, members).name,
    })
  }

  for (const comment of history?.comments ?? []) {
    items.push({
      id: comment.id,
      kind: 'comment',
      timestamp: comment.createdAt,
      authorName:
        comment.userId === currentUserId ? 'Você' : resolveAgent(comment.userId, members).name,
      text: comment.text,
    })
  }

  for (const proposal of proposals ?? []) {
    items.push({
      id: `proposal-${proposal.id}`,
      kind: 'proposal',
      timestamp: proposal.createdAt,
      // Propostas antigas podem não ter autor — aí o "por" some.
      authorName: !proposal.createdByUserId
        ? undefined
        : proposal.createdByUserId === currentUserId
          ? 'Você'
          : resolveAgent(proposal.createdByUserId, members).name,
      text: describeProposalForHistory(proposal),
    })
  }

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function filterHistoryFeed(feed: FeedItem[], tab: HistoryTab): FeedItem[] {
  if (tab === 'todos') return feed
  if (tab === 'comentarios') return feed.filter((item) => item.kind === 'comment')
  if (tab === 'sistema') return feed.filter((item) => item.kind !== 'comment')
  return [] // 'whatsapp' — sem fonte de dado real hoje
}

function formatHistoryTimestamp(iso: string): string {
  const date = new Date(iso)
  const datePart = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
  const timePart = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${datePart} ${timePart}`
}

// ── Helper: parse cota string ──────────────────────────────────────────────────

function parseCota(cota: string): { type: string; value: string } {
  const match = cota.match(/^Cota\s+(R\$[\d\s.,]+)\s*\((.+)\)$/)
  if (match?.[1] && match[2]) return { value: match[1].trim(), type: match[2].trim() }
  return { type: cota, value: '' }
}

// ── Helper: edição de atributos ─────────────────────────────────────────────────

interface AttrsForm {
  name: string
  phone: string
  email: string
  segment: string
  value: string
  quotaCount: string
  profession: string
  income: string
  maritalStatus: string
  cpf: string
}

const AUTOSAVE_DELAY_MS = 1000

const MARITAL_STATUS_OPTIONS = [
  'Solteiro(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viúvo(a)',
  'União Estável',
]

// ── Simulação de crédito ─────────────────────────────────────────────────────
//
// Fluxo: "Nova Simulação"/"Simular" abre um formulário com valor de entrada e
// quantidade de meses (sempre — são específicos de CADA proposta, o mesmo
// lead pode simular várias vezes com valores diferentes) e, se faltar algo na
// Ficha de Qualificação (profissão, renda, estado civil, CPF — dados do
// cliente, compartilhados entre propostas), pede pra completar também. Depois
// mostra uma análise "carregando" por um tempo aleatório entre 30s e 60s e
// registra a proposta aprovada (ver useCreateLeadProposal) — não é uma
// análise real, é o efeito "aguarde, estamos analisando" que o time de vendas
// pediu.

type SimulationState =
  | { status: 'idle' }
  | { status: 'loading'; durationMs: number }
  | { status: 'approved'; proposal: LeadProposal }

const SIMULATION_MIN_MS = 30_000
const SIMULATION_MAX_MS = 60_000

/** Mensagens que revezam durante a análise — puro efeito visual, sem ligação
 * com nenhuma etapa real de processamento. */
const ANALYSIS_STEPS = [
  'Consultando score de crédito...',
  'Validando documentos...',
  'Analisando perfil financeiro...',
  'Verificando restrições...',
  'Finalizando análise...',
]

interface QualificationFieldDef {
  key: 'profession' | 'income' | 'maritalStatus' | 'cpf'
  label: string
  isMissing: (card: CardData) => boolean
}

const QUALIFICATION_FIELD_DEFS: QualificationFieldDef[] = [
  { key: 'profession', label: 'Profissão', isMissing: (c) => !c.profession },
  { key: 'income', label: 'Renda', isMissing: (c) => c.incomeCents == null },
  { key: 'maritalStatus', label: 'Estado Civil', isMissing: (c) => !c.maritalStatus },
  { key: 'cpf', label: 'CPF', isMissing: (c) => !c.cpf },
]

function missingQualificationFields(card: CardData): QualificationFieldDef[] {
  return QUALIFICATION_FIELD_DEFS.filter((def) => def.isMissing(card))
}

function buildAttrsForm(card: CardData): AttrsForm {
  return {
    name: card.name,
    phone: card.phone,
    email: card.email ?? '',
    segment: card.segment,
    value: centsToMoneyInput(card.valueCents),
    quotaCount: String(card.quotaCount),
    profession: card.profession ?? '',
    income: card.incomeCents != null ? centsToMoneyInput(card.incomeCents) : '',
    maritalStatus: card.maritalStatus ?? '',
    cpf: card.cpf ?? '',
  }
}

/** Retorna o payload pronto pra PATCH, ou null se algum campo obrigatório for inválido. */
function buildAttrsPayload(form: AttrsForm) {
  const valueCents = parseValueToCents(form.value)
  const phoneDigits = form.phone.replace(/\D/g, '')
  if (!form.name.trim() || !form.segment.trim() || valueCents === null || phoneDigits.length < 10) {
    return null
  }
  return {
    name: form.name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim() || null,
    segment: form.segment,
    valueCents,
    quotaCount: Math.max(1, Number.parseInt(form.quotaCount, 10) || 1),
    profession: form.profession.trim() || null,
    incomeCents: form.income.trim() ? parseValueToCents(form.income) : null,
    maritalStatus: form.maritalStatus || null,
    cpf: form.cpf.trim() || null,
  }
}

// ── LeadModal ──────────────────────────────────────────────────────────────────

export interface LeadModalProps {
  card: CardData
  /** Funil ao qual o lead pertence — fonte dos estágios/ordem da barra de progresso. */
  funnel: Funnel
  /** Todos os funis da org — opções pra "Transferir" (duplicar pra outro funil). */
  funnels: Funnel[]
  onClose: () => void
  /** Quando true, exibe skeleton no workspace — para quando os dados vierem de API real */
  isLoading?: boolean
}

export function LeadModal({ card, funnel, funnels, onClose, isLoading = false }: LeadModalProps) {
  const [comment, setComment] = useState('')
  const [historyTab, setHistoryTab] = useState<HistoryTab>('todos')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [addingTag, setAddingTag] = useState(false)
  const tagPickerRef = useRef<HTMLDivElement>(null)

  const [isEditingAttrs, setIsEditingAttrs] = useState(false)
  const [attrsForm, setAttrsForm] = useState<AttrsForm>(() => buildAttrsForm(card))
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [simulation, setSimulation] = useState<SimulationState>({ status: 'idle' })
  const simulationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [simulationFormOpen, setSimulationFormOpen] = useState(false)
  const [qualificationGapFields, setQualificationGapFields] = useState<QualificationFieldDef[]>([])
  const [gapForm, setGapForm] = useState<AttrsForm>(() => buildAttrsForm(card))
  const [simulationParams, setSimulationParams] = useState<{
    tableName: string
    downPayment: string
    termMonths: string
    installmentRows: InstallmentRow[]
  }>({
    tableName: '',
    downPayment: '',
    termMonths: '',
    installmentRows: [EMPTY_INSTALLMENT_ROW],
  })
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0)

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
      if (simulationTimer.current) clearTimeout(simulationTimer.current)
    }
  }, [])

  // Revezamento das mensagens de análise — só enquanto está "carregando".
  useEffect(() => {
    if (simulation.status !== 'loading') {
      setAnalysisStepIndex(0)
      return
    }
    const interval = setInterval(() => {
      setAnalysisStepIndex((i) => (i + 1) % ANALYSIS_STEPS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [simulation.status])

  const { organizationId, membership } = useActiveOrganization()
  const { data: teamData } = useTeamMembersQuery(organizationId)
  const members = teamData?.members ?? []
  const { data: settingsData } = useOrganizationSettingsQuery(organizationId)
  const leadSegments = settingsData?.organization.leadSegments ?? []
  const availableTags = (settingsData?.organization.leadTags ?? []).filter(
    (tag) => !card.tags.includes(tag),
  )
  const updateLead = useUpdateLead(organizationId)
  const deleteLead = useDeleteLead(organizationId)
  const duplicateLead = useDuplicateLead(organizationId)
  const { data: currentUser } = useCurrentUser()
  const { data: history } = useLeadHistoryQuery(organizationId, card.id)
  const createComment = useCreateLeadComment(organizationId, card.id)
  const { data: proposalsData } = useLeadProposalsQuery(organizationId, card.id)
  const createLeadProposal = useCreateLeadProposal(organizationId, card.id)
  const shareLeadProposal = useShareLeadProposal(organizationId, card.id)
  const { data: leadTasksData } = useTasksQuery(organizationId, {
    leadId: card.id,
    status: 'todos',
    pageSize: 20,
  })
  const leadTasks = leadTasksData?.items ?? []
  const createTask = useCreateTask(organizationId)
  const updateTaskMutation = useUpdateTask(organizationId)
  const deleteTaskMutation = useDeleteTask(organizationId)
  const [taskDetail, setTaskDetail] = useState<Task | null>(null)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [editingLeadTask, setEditingLeadTask] = useState<Task | null>(null)
  const { toast } = useToast()

  const canAssign = membership?.permissions.includes('lead.assign') ?? false
  const canAssignTask = membership?.permissions.includes('task.assign') ?? false
  const canManageLost = membership?.permissions.includes('lead.manage_lost') ?? false
  const cardOutcome = resolveCardOutcome(card)
  const isViewingLost = cardOutcome === 'perdido'
  const isViewingWon = cardOutcome === 'ganho'
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

  function handleStageClick(stageId: string) {
    if (stageId === card.stageId) return
    updateLead.mutate(
      { id: card.id, payload: { stageId } },
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
      { id: card.id, payload: { won: true } },
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

  function handleTransferToFunnel(targetFunnelId: string, targetFunnelName: string) {
    duplicateLead.mutate(
      { id: card.id, targetFunnelId },
      {
        onSuccess: () => {
          toast({ type: 'success', title: `Lead duplicado para "${targetFunnelName}"` })
        },
        onError: (error) => {
          toast({
            type: 'error',
            title: 'Não foi possível transferir o lead',
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

  function saveAttrs(form: AttrsForm) {
    const payload = buildAttrsPayload(form)
    if (!payload) return
    updateLead.mutate(
      { id: card.id, payload },
      {
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

  function updateAttrField<K extends keyof AttrsForm>(key: K, value: AttrsForm[K]) {
    setAttrsForm((prev) => {
      const next = { ...prev, [key]: value }
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
      autosaveTimer.current = setTimeout(() => saveAttrs(next), AUTOSAVE_DELAY_MS)
      return next
    })
  }

  function handleSaveAttrsNow() {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current)
      autosaveTimer.current = null
    }
    const payload = buildAttrsPayload(attrsForm)
    if (!payload) {
      toast({
        type: 'error',
        title: 'Verifique os campos',
        description: 'Nome, telefone (DDD + número) e tipo de crédito são obrigatórios.',
      })
      return
    }
    updateLead.mutate(
      { id: card.id, payload },
      {
        onSuccess: () => toast({ type: 'success', title: 'Alterações salvas' }),
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

  function handleToggleEditAttrs() {
    if (isEditingAttrs) {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current)
        autosaveTimer.current = null
      }
      const payload = buildAttrsPayload(attrsForm)
      if (payload) {
        updateLead.mutate(
          { id: card.id, payload },
          {
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
      setIsEditingAttrs(false)
    } else {
      setAttrsForm(buildAttrsForm(card))
      setIsEditingAttrs(true)
    }
  }

  function startSimulation(payload: CreateLeadProposalPayload) {
    const delayMs = SIMULATION_MIN_MS + Math.random() * (SIMULATION_MAX_MS - SIMULATION_MIN_MS)
    setSimulation({ status: 'loading', durationMs: delayMs })
    simulationTimer.current = setTimeout(() => {
      createLeadProposal.mutate(payload, {
        onSuccess: (proposal) => {
          setSimulation({ status: 'approved', proposal })
        },
        onError: (error) => {
          setSimulation({ status: 'idle' })
          toast({
            type: 'error',
            title: 'Não foi possível registrar a proposta',
            description: error instanceof Error ? error.message : undefined,
          })
        },
      })
    }, delayMs)
  }

  async function handleDownloadProposalPdf(proposal: LeadProposal) {
    try {
      await downloadProposalPdf({
        organizationName: membership?.organizationName ?? '',
        consultantName: card.assignedUserId ? responsible.name : null,
        client: { name: card.name, cpf: card.cpf, phone: card.phone, email: card.email },
        cota: card.cota,
        valueCents: card.valueCents,
        tableName: proposal.tableName,
        downPaymentCents: proposal.downPaymentCents,
        termMonths: proposal.termMonths,
        installments: proposal.installments,
        createdAt: new Date(proposal.createdAt),
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível gerar o PDF',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  /** Gera o link público (se ainda não existir) e copia pro vendedor colar
   * no WhatsApp/e-mail. Quando o cliente abrir, chega notificação no sininho. */
  async function handleCopyProposalLink(proposal: LeadProposal) {
    let url: string
    try {
      const shareToken =
        proposal.shareToken ?? (await shareLeadProposal.mutateAsync(proposal.id)).shareToken
      url = proposalShareUrl(shareToken)
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível gerar o link',
        description: error instanceof Error ? error.message : undefined,
      })
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast({
        type: 'success',
        title: 'Link da proposta copiado',
        description: 'Você recebe uma notificação quando o cliente abrir.',
      })
    } catch {
      // Clipboard bloqueado (permissão/contexto inseguro) — mostra o link pra
      // copiar na mão.
      toast({ type: 'info', title: 'Copie o link da proposta', description: url })
    }
  }

  function updateInstallmentRow(index: number, patch: Partial<InstallmentRow>) {
    setSimulationParams((prev) => ({
      ...prev,
      installmentRows: prev.installmentRows.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    }))
  }

  function addInstallmentRow() {
    setSimulationParams((prev) => ({
      ...prev,
      installmentRows: [...prev.installmentRows, EMPTY_INSTALLMENT_ROW],
    }))
  }

  function removeInstallmentRow(index: number) {
    setSimulationParams((prev) => ({
      ...prev,
      installmentRows: prev.installmentRows.filter((_, i) => i !== index),
    }))
  }

  /** Sempre abre o formulário — entrada e prazo são pedidos em toda simulação
   * (são por-proposta); a Ficha de Qualificação só aparece nele quando falta
   * algo (profissão/renda/estado civil/CPF são do cliente, preenchidos 1x). */
  function handleSimulate() {
    setGapForm(buildAttrsForm(card))
    setQualificationGapFields(missingQualificationFields(card))
    setSimulationParams({
      tableName: '',
      downPayment: '',
      termMonths: '',
      installmentRows: [EMPTY_INSTALLMENT_ROW],
    })
    setSimulationFormOpen(true)
  }

  function updateGapField<K extends keyof AttrsForm>(key: K, value: AttrsForm[K]) {
    setGapForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmitSimulationForm() {
    const downPaymentCents = parseValueToCents(simulationParams.downPayment)
    const tableName = simulationParams.tableName.trim() || null
    const termMonths = simulationParams.termMonths.trim()
      ? Number.parseInt(simulationParams.termMonths, 10)
      : null

    if (downPaymentCents === null || !termMonths || termMonths <= 0) {
      toast({ type: 'error', title: 'Informe o valor de entrada e a quantidade de meses.' })
      return
    }
    if (downPaymentCents >= card.valueCents) {
      toast({ type: 'error', title: 'O valor de entrada precisa ser menor que o valor da cota.' })
      return
    }
    const installments = buildInstallmentRanges(simulationParams.installmentRows, termMonths)
    if (!installments.ok) {
      toast({ type: 'error', title: installments.error })
      return
    }

    const qualificationPayload =
      qualificationGapFields.length > 0 ? buildAttrsPayload(gapForm) : null
    const qualificationIncomplete =
      qualificationGapFields.length > 0 &&
      (!qualificationPayload ||
        !qualificationPayload.profession ||
        qualificationPayload.incomeCents == null ||
        !qualificationPayload.maritalStatus ||
        !qualificationPayload.cpf)
    if (qualificationIncomplete) {
      toast({ type: 'error', title: 'Preencha todos os campos destacados.' })
      return
    }

    function proceed() {
      setSimulationFormOpen(false)
      startSimulation({
        downPaymentCents: downPaymentCents as number,
        termMonths: termMonths as number,
        tableName,
        installments: installments.ok ? installments.ranges : null,
      })
    }

    if (qualificationPayload) {
      updateLead.mutate(
        { id: card.id, payload: qualificationPayload },
        {
          onSuccess: proceed,
          onError: (error) => {
            toast({
              type: 'error',
              title: 'Não foi possível salvar os dados',
              description: error instanceof Error ? error.message : undefined,
            })
          },
        },
      )
    } else {
      proceed()
    }
  }

  function handleResetSimulation() {
    if (simulationTimer.current) {
      clearTimeout(simulationTimer.current)
      simulationTimer.current = null
    }
    setSimulation({ status: 'idle' })
  }

  /** Botão "Nova Simulação" do cabeçalho da aba — cancela qualquer simulação
   * em andamento/concluída e abre o formulário de uma nova proposta. */
  function handleNovaSimulacao() {
    handleResetSimulation()
    handleSimulate()
  }

  function handleQuickCreateTask(type: TaskType, title: string, hoursFromNow: number) {
    if (!currentUser) return
    const dueAt = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString()
    createTask.mutate(
      { leadId: card.id, assignedUserId: currentUser.id, type, title, dueAt },
      {
        onSuccess: () => toast({ type: 'success', title: 'Tarefa criada' }),
        onError: (error) => {
          toast({
            type: 'error',
            title: 'Não foi possível criar a tarefa',
            description: error instanceof Error ? error.message : undefined,
          })
        },
      },
    )
  }

  function handleToggleTaskComplete(task: Task) {
    updateTaskMutation.mutate({
      id: task.id,
      payload: { status: task.status === 'concluida' ? 'pendente' : 'concluida' },
    })
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

  function handleReopenWon() {
    updateLead.mutate(
      { id: card.id, payload: { won: false } },
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
    createComment.mutate(trimmed, {
      onSuccess: () => setComment(''),
      onError: (error) => {
        toast({
          type: 'error',
          title: 'Não foi possível adicionar o comentário',
          description: error instanceof Error ? error.message : undefined,
        })
      },
    })
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
  const activeStageIndex = funnel.stages.findIndex((stage) => stage.id === card.stageId)
  const activeStage = activeStageIndex === -1 ? 0 : activeStageIndex
  // "Marcar como Ganho" só é permitido a partir da ÚLTIMA etapa (por ordem)
  // do funil — generalização de "só a partir de Fechado" pra qualquer funil
  // customizado (ver update-lead.use-case.ts, mesma regra no backend).
  const lastStage = funnel.stages[funnel.stages.length - 1]
  const isAtLastStage = lastStage !== undefined && card.stageId === lastStage.id
  const otherFunnels = funnels.filter((f) => f.id !== funnel.id)
  const responsible = resolveAgent(card.assignedUserId, members)
  const historyFeed = buildHistoryFeed(
    card,
    history,
    proposalsData?.proposals,
    members,
    currentUser?.id,
  )
  const filteredHistoryFeed = filterHistoryFeed(historyFeed, historyTab)

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
              {otherFunnels.length > 0 && (
                <Dropdown
                  trigger={
                    <button type="button" className={styles.btnSecondary}>
                      <TransferIcon />
                      Transferir
                    </button>
                  }
                  items={otherFunnels.map((f) => ({
                    key: f.id,
                    label: f.name,
                    onSelect: () => handleTransferToFunnel(f.id, f.name),
                  }))}
                />
              )}
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
              ) : isViewingWon ? (
                <button
                  type="button"
                  className={styles.btnGanho}
                  onClick={handleReopenWon}
                  disabled={updateLead.isPending}
                >
                  <RefreshIcon />
                  Reabrir Lead
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={handleMarkLost}
                    disabled={updateLead.isPending}
                  >
                    <ThumbsDownIcon />
                    Marcar como Perdido
                  </button>
                  {isAtLastStage && (
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
            {funnel.stages.map((stage, i) => {
              // Ganho/Perdido são desacoplados do estágio — qualquer etapa aceita
              // clique normalmente. A única trava é: um lead já ganho/perdido
              // precisa ser reaberto antes de mudar de etapa (evita desfazer o
              // resultado silenciosamente ao clicar num estágio diferente).
              const isLockedByOutcome = isViewingWon || isViewingLost
              return (
                <span key={stage.id} className={styles.funnelGroup}>
                  <button
                    type="button"
                    className={i === activeStage ? styles.funnelStageActive : styles.funnelStage}
                    onClick={() => handleStageClick(stage.id)}
                    disabled={updateLead.isPending || isLockedByOutcome}
                    title={
                      isLockedByOutcome ? 'Reabra o lead para poder mudar de etapa.' : undefined
                    }
                  >
                    {stage.name}
                  </button>
                  {i < funnel.stages.length - 1 && (
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
                    <div className={styles.editActions}>
                      {isEditingAttrs && (
                        <button
                          type="button"
                          className={styles.btnGanho}
                          onClick={handleSaveAttrsNow}
                          disabled={updateLead.isPending}
                        >
                          <CheckIcon />
                          Salvar
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={handleToggleEditAttrs}
                      >
                        <PencilIcon />
                        {isEditingAttrs ? 'Concluir Edição' : 'Editar Atributos'}
                      </button>
                    </div>
                  )}
                  {activeTab === 'simulacoes' && (
                    <button
                      type="button"
                      className={styles.novaSimBtn}
                      onClick={handleNovaSimulacao}
                      disabled={simulation.status === 'loading'}
                    >
                      <LightningIcon />
                      Nova Simulação
                    </button>
                  )}
                </div>

                {/* ── Aba: Simulações ─────────────────────────────────── */}
                {activeTab === 'simulacoes' && (
                  <div className={styles.simList}>
                    {/* Simular Proposta (crédito, a partir da Ficha de Qualificação) */}
                    <div className={styles.simNewBlock}>
                      {simulation.status === 'idle' && (
                        <>
                          <div className={styles.simNewHeader}>
                            <div className={styles.simNewIcon}>
                              <LightningIcon />
                            </div>
                            <div>
                              <h4 className={styles.simNewTitle}>Simular Proposta</h4>
                              <p className={styles.simNewSub}>
                                Usa profissão, renda, estado civil, CPF, entrada e prazo da Ficha de
                                Qualificação para rodar a análise de crédito.
                              </p>
                            </div>
                          </div>
                          <button type="button" className={styles.pdfBtn} onClick={handleSimulate}>
                            <LightningIcon />
                            Simular
                          </button>
                        </>
                      )}

                      {simulation.status === 'loading' && (
                        <div className={styles.simLoading}>
                          <div className={styles.simSpinnerRing}>
                            <span className={styles.simSpinner} aria-hidden="true" />
                            <ClockIcon />
                          </div>
                          <h4 className={styles.simLoadingTitle}>Analisando a proposta</h4>
                          <p className={styles.simLoadingStep}>
                            {ANALYSIS_STEPS[analysisStepIndex]}
                          </p>
                          <div className={styles.simProgressTrack}>
                            <div
                              key={simulation.durationMs}
                              className={styles.simProgressBar}
                              style={{ animationDuration: `${simulation.durationMs}ms` }}
                            />
                          </div>
                          <p className={styles.simLoadingHint}>
                            Isso pode levar até 1 minuto — não feche esta janela.
                          </p>
                        </div>
                      )}

                      {simulation.status === 'approved' && (
                        <div className={styles.simApproved}>
                          <div className={styles.simApprovedBadge}>
                            <TrophyIcon />
                          </div>
                          <h4 className={styles.simApprovedTitle}>Crédito Aprovado!</h4>
                          <p className={styles.simApprovedSub}>
                            A proposta de <strong>{card.name}</strong> foi pré-aprovada com sucesso.
                          </p>
                          <div className={styles.simApprovedSummary}>
                            {simulation.proposal.tableName && (
                              <div className={styles.simApprovedItem}>
                                <span className={styles.simApprovedLabel}>Tabela</span>
                                <span className={styles.simApprovedValue}>
                                  {simulation.proposal.tableName}
                                </span>
                              </div>
                            )}
                            <div className={styles.simApprovedItem}>
                              <span className={styles.simApprovedLabel}>Valor da Cota</span>
                              <span className={styles.simApprovedValue}>
                                R$ {formatBRL(card.valueCents)}
                              </span>
                            </div>
                            <div className={styles.simApprovedItem}>
                              <span className={styles.simApprovedLabel}>Entrada</span>
                              <span className={styles.simApprovedValue}>
                                R$ {formatBRL(simulation.proposal.downPaymentCents)}
                              </span>
                            </div>
                            <div className={styles.simApprovedItem}>
                              <span className={styles.simApprovedLabel}>Prazo</span>
                              <span className={styles.simApprovedValue}>
                                {simulation.proposal.termMonths}x
                              </span>
                            </div>
                          </div>
                          {simulation.proposal.installments && (
                            <p className={styles.simApprovedInstallments}>
                              Parcelas: {describeInstallments(simulation.proposal.installments)}
                            </p>
                          )}
                          <div className={styles.simApprovedActions}>
                            <button
                              type="button"
                              className={styles.pdfBtn}
                              onClick={() => handleDownloadProposalPdf(simulation.proposal)}
                            >
                              <DownloadIcon />
                              Baixar PDF da proposta
                            </button>
                            <button
                              type="button"
                              className={styles.simSecBtn}
                              onClick={() => handleCopyProposalLink(simulation.proposal)}
                              disabled={shareLeadProposal.isPending}
                            >
                              <LinkIcon />
                              Copiar link
                            </button>
                            <button
                              type="button"
                              className={styles.simSecBtn}
                              onClick={handleResetSimulation}
                            >
                              Nova simulação
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Propostas já simuladas e aprovadas — entrada/prazo são
                        específicos de cada uma (ver useLeadProposalsQuery). */}
                    {proposalsData?.proposals.length ? (
                      proposalsData.proposals.map((proposal) => (
                        <div key={proposal.id} className={styles.simCardMain}>
                          <div className={styles.simTopRow}>
                            <span className={styles.propPrincipalBadge}>
                              <span className={styles.propDot} />
                              Crédito Aprovado
                            </span>
                            <div className={styles.simMeta}>
                              <span>
                                {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>

                          <div className={styles.simHeader}>
                            <div>
                              <h3 className={styles.simTitle}>{card.cota}</h3>
                              {proposal.tableName && (
                                <p className={styles.simValue}>Tabela: {proposal.tableName}</p>
                              )}
                              <p className={styles.simValue}>
                                Entrada: R$ {formatBRL(proposal.downPaymentCents)}
                              </p>
                              {proposal.installments && (
                                <p className={styles.simValue}>
                                  Parcelas: {describeInstallments(proposal.installments)}
                                </p>
                              )}
                            </div>
                            <div className={styles.simParcelGroup}>
                              <span className={styles.simParcelLabel}>Prazo</span>
                              <div className={styles.simParcelValue}>
                                <span className={styles.simParcelAmount}>
                                  {proposal.termMonths}x
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className={styles.simCardActions}>
                            <button
                              type="button"
                              className={styles.simSecBtn}
                              onClick={() => handleDownloadProposalPdf(proposal)}
                            >
                              <DownloadIcon />
                              Baixar PDF
                            </button>
                            <button
                              type="button"
                              className={styles.simSecBtn}
                              onClick={() => handleCopyProposalLink(proposal)}
                              disabled={shareLeadProposal.isPending}
                            >
                              <LinkIcon />
                              Copiar link
                            </button>
                            {describeProposalViews(proposal) && (
                              <span
                                className={
                                  proposal.viewCount > 0
                                    ? styles.simViewsOpened
                                    : styles.simViewsPending
                                }
                              >
                                {describeProposalViews(proposal)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : simulation.status === 'idle' ? (
                      <p className={styles.attrValueMuted}>Nenhuma proposta simulada ainda.</p>
                    ) : null}
                  </div>
                )}

                {/* ── Aba: Qualificação ────────────────────────────────── */}
                {activeTab === 'qualificacao' && (
                  <>
                    {/* Grade de atributos */}
                    <div className={styles.attrsGrid}>
                      {/* Nome */}
                      <div className={styles.attrCell}>
                        <div className={styles.attrLabel}>
                          <PersonIcon />
                          Nome
                        </div>
                        {isEditingAttrs ? (
                          <input
                            className={styles.attrInput}
                            value={attrsForm.name}
                            onChange={(e) => updateAttrField('name', e.target.value)}
                          />
                        ) : (
                          <div className={styles.attrValue}>
                            <span className={styles.attrValueText}>{card.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Telefone */}
                      <div className={styles.attrCell}>
                        <div className={styles.attrLabel}>
                          <PhoneIcon />
                          Telefone / WhatsApp
                        </div>
                        {isEditingAttrs ? (
                          <input
                            className={styles.attrInput}
                            value={attrsForm.phone}
                            onChange={(e) =>
                              updateAttrField('phone', formatPhoneBR(e.target.value))
                            }
                          />
                        ) : (
                          <div className={styles.attrValue}>
                            <span className={styles.attrValueText}>{card.phone}</span>
                            <span className={styles.callBadge}>
                              <WhatsAppIcon />
                              Chamar
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Email */}
                      <div className={styles.attrCell}>
                        <div className={styles.attrLabel}>
                          <MailIcon />
                          Email
                        </div>
                        {isEditingAttrs ? (
                          <input
                            type="email"
                            className={styles.attrInput}
                            value={attrsForm.email}
                            placeholder="nome@exemplo.com"
                            onChange={(e) => updateAttrField('email', e.target.value)}
                          />
                        ) : (
                          <div className={styles.attrValue}>
                            <span className={styles.attrValueText}>{card.email ?? '—'}</span>
                          </div>
                        )}
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
                        {isEditingAttrs ? (
                          <div className={styles.attrValueCol}>
                            <select
                              className={styles.attrInput}
                              value={attrsForm.segment}
                              onChange={(e) => updateAttrField('segment', e.target.value)}
                            >
                              <option value="" disabled>
                                Selecione…
                              </option>
                              {leadSegments.map((segment) => (
                                <option key={segment} value={segment}>
                                  {segment}
                                </option>
                              ))}
                            </select>
                            <div className={styles.attrValue} style={{ marginTop: 4 }}>
                              <input
                                className={styles.attrInput}
                                style={{ maxWidth: 120 }}
                                inputMode="numeric"
                                placeholder="Valor (R$)"
                                value={attrsForm.value}
                                onChange={(e) =>
                                  updateAttrField('value', formatMoneyInput(e.target.value))
                                }
                              />
                              <input
                                className={styles.attrInput}
                                style={{ maxWidth: 70 }}
                                type="number"
                                min={1}
                                placeholder="Cotas"
                                value={attrsForm.quotaCount}
                                onChange={(e) =>
                                  updateAttrField(
                                    'quotaCount',
                                    e.target.value.replace(/[^0-9]/g, ''),
                                  )
                                }
                              />
                            </div>
                          </div>
                        ) : (
                          <div className={styles.attrValueCol}>
                            {cota.type && <span className={styles.attrValueBold}>{cota.type}</span>}
                            {cota.value && (
                              <span className={styles.attrValueSub}>{cota.value}</span>
                            )}
                            {!cota.type && (
                              <span className={styles.attrValueBold}>{card.cota}</span>
                            )}
                          </div>
                        )}
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

                      {/* Profissão */}
                      <div className={styles.attrCell}>
                        <div className={styles.attrLabel}>
                          <PersonIcon />
                          Profissão
                        </div>
                        {isEditingAttrs ? (
                          <input
                            className={styles.attrInput}
                            value={attrsForm.profession}
                            onChange={(e) => updateAttrField('profession', e.target.value)}
                          />
                        ) : (
                          <div className={styles.attrValue}>
                            <span className={styles.attrValueText}>{card.profession ?? '—'}</span>
                          </div>
                        )}
                      </div>

                      {/* Renda */}
                      <div className={styles.attrCell}>
                        <div className={styles.attrLabel}>
                          <CurrencyIcon />
                          Renda
                        </div>
                        {isEditingAttrs ? (
                          <input
                            className={styles.attrInput}
                            inputMode="numeric"
                            placeholder="R$"
                            value={attrsForm.income}
                            onChange={(e) =>
                              updateAttrField('income', formatMoneyInput(e.target.value))
                            }
                          />
                        ) : (
                          <div className={styles.attrValue}>
                            <span className={styles.attrValueText}>
                              {card.incomeCents != null ? `R$ ${formatBRL(card.incomeCents)}` : '—'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Estado Civil */}
                      <div className={styles.attrCell}>
                        <div className={styles.attrLabel}>
                          <PersonIcon />
                          Estado Civil
                        </div>
                        {isEditingAttrs ? (
                          <select
                            className={styles.attrInput}
                            value={attrsForm.maritalStatus}
                            onChange={(e) => updateAttrField('maritalStatus', e.target.value)}
                          >
                            <option value="">Selecione…</option>
                            {MARITAL_STATUS_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className={styles.attrValue}>
                            <span className={styles.attrValueText}>
                              {card.maritalStatus ?? '—'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* CPF */}
                      <div className={styles.attrCell}>
                        <div className={styles.attrLabel}>
                          <IdCardIcon />
                          CPF
                        </div>
                        {isEditingAttrs ? (
                          <input
                            className={styles.attrInput}
                            placeholder="000.000.000-00"
                            value={attrsForm.cpf}
                            onChange={(e) => updateAttrField('cpf', formatCPF(e.target.value))}
                          />
                        ) : (
                          <div className={styles.attrValue}>
                            <span className={styles.attrValueText}>{card.cpf ?? '—'}</span>
                          </div>
                        )}
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

              {/* Card: Tarefas — fica fora da aba Simulações, que já é longa. */}
              {activeTab !== 'simulacoes' && (
                <div className={styles.card}>
                  <div className={styles.taskHeader}>
                    <div>
                      <h2 className={styles.taskTitle}>Tarefas</h2>
                      <p className={styles.taskSubtitle}>
                        Acompanhe contatos telefônicos, envio de simulações e visitas presenciais.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.newTaskBtn}
                      onClick={() => setTaskFormOpen(true)}
                    >
                      <PlusIcon />
                      Nova Tarefa
                    </button>
                  </div>

                  {/* Quick chips */}
                  <div className={styles.chipsRow}>
                    <span className={styles.chipsLabel}>Criar rápido:</span>
                    <button
                      type="button"
                      className={styles.chip}
                      disabled={createTask.isPending}
                      onClick={() =>
                        handleQuickCreateTask(
                          'Ligação',
                          `Ligação de follow-up com ${card.name}`,
                          24,
                        )
                      }
                    >
                      <PhoneIcon />
                      Ligação de Follow-up
                    </button>
                    <button
                      type="button"
                      className={styles.chip}
                      disabled={createTask.isPending}
                      onClick={() =>
                        handleQuickCreateTask('Simulação', `Simular lance para ${card.name}`, 24)
                      }
                    >
                      <CalendarIcon />
                      Simulação de Lance
                    </button>
                    <button
                      type="button"
                      className={styles.chip}
                      disabled={createTask.isPending}
                      onClick={() =>
                        handleQuickCreateTask('Reunião', `Reunião com ${card.name}`, 48)
                      }
                    >
                      <CalendarIcon />
                      Agendar Reunião
                    </button>
                  </div>

                  {/* Lista de tarefas */}
                  <div className={styles.taskList}>
                    {leadTasks.length === 0 && (
                      <p className={styles.attrValueMuted}>
                        Nenhuma tarefa criada pra este lead ainda.
                      </p>
                    )}
                    {leadTasks.map((task) => {
                      const urgent = displayStatus(task) === 'atrasada'
                      const badge = TASK_TYPE_BADGES[task.type]
                      return (
                        <button
                          key={task.id}
                          type="button"
                          className={urgent ? styles.taskItemUrgent : styles.taskItem}
                          onClick={() => setTaskDetail(task)}
                          style={{ cursor: 'pointer', width: '100%', textAlign: 'left' }}
                        >
                          <div className={styles.taskLeft}>
                            {/* biome-ignore lint/a11y/useKeyWithClickEvents: mouse-only shortcut — completing via TaskModal's "Concluir" button stays keyboard-accessible */}
                            <span
                              className={styles.taskCheckbox}
                              title={
                                task.status === 'concluida' ? 'Reabrir tarefa' : 'Concluir tarefa'
                              }
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleTaskComplete(task)
                              }}
                            />
                            <div className={styles.taskContent}>
                              <span className={styles.taskItemTitle}>{task.title}</span>
                              <div className={styles.taskMeta}>
                                <span className={urgent ? styles.taskTimeUrgent : styles.taskTime}>
                                  <ClockIcon />
                                  {formatTaskDateTime(task.dueAt)}
                                </span>
                                <span className={styles.taskMetaDot}>•</span>
                                <span className={styles.taskMetaText}>
                                  Resp: {resolveAgent(task.assignedUserId, members).name}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className={styles.taskRight}>
                            <span
                              className={styles.priorityBadgeNormal}
                              style={{
                                background: badge.bg,
                                borderColor: badge.border,
                                color: badge.color,
                              }}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Coluna direita — Histórico (conteúdo real) */}
            <div className={styles.rightCol}>
              <div className={styles.historyCard}>
                {/* Header do histórico */}
                <div className={styles.historyHeader}>
                  <div className={styles.historyHeaderLeft}>
                    <h2 className={styles.historyTitle}>Histórico</h2>
                    <span className={styles.historyCount}>{historyFeed.length}</span>
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
                  {(['todos', 'comentarios', 'sistema', 'whatsapp'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={historyTab === tab ? styles.filterPillActive : styles.filterPill}
                      onClick={() => setHistoryTab(tab)}
                    >
                      {HISTORY_TAB_LABEL[tab]}
                    </button>
                  ))}
                </div>

                {/* Timeline */}
                <div className={styles.timeline}>
                  {filteredHistoryFeed.length === 0 && (
                    <p className={styles.timelineBody}>Nenhum evento aqui ainda.</p>
                  )}
                  {filteredHistoryFeed.map((item, i) => (
                    <div key={item.id} className={styles.timelineEvent}>
                      <div className={styles.timelineLeft}>
                        <div
                          className={
                            item.kind === 'comment'
                              ? `${styles.timelineIcon} ${styles.timelineIconComment}`
                              : item.kind === 'created'
                                ? `${styles.timelineIcon} ${styles.timelineIconCreated}`
                                : item.kind === 'proposal'
                                  ? `${styles.timelineIcon} ${styles.timelineIconProposal}`
                                  : `${styles.timelineIcon} ${styles.timelineIconSystem}`
                          }
                        >
                          {item.kind === 'comment' && <CommentIcon />}
                          {item.kind === 'assignment' && <LightningIcon />}
                          {item.kind === 'created' && <CheckIcon />}
                          {item.kind === 'proposal' && <TrophyIcon />}
                        </div>
                        {i < filteredHistoryFeed.length - 1 && (
                          <div className={styles.timelineConnector} />
                        )}
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineRow}>
                          <span className={styles.timelineTitle}>
                            {item.kind === 'created'
                              ? 'Lead criado'
                              : item.kind === 'assignment'
                                ? 'Responsável alterado'
                                : item.kind === 'proposal'
                                  ? 'Proposta gerada'
                                  : 'Comentário'}
                          </span>
                          <span className={styles.timelineDate}>
                            {formatHistoryTimestamp(item.timestamp)}
                          </span>
                        </div>

                        {item.kind === 'assignment' && (
                          <p className={styles.timelineBody}>
                            por{' '}
                            <strong className={styles.timelineBold}>{item.changedByName}</strong>
                          </p>
                        )}

                        {(item.kind === 'comment' ||
                          (item.kind === 'proposal' && item.authorName)) && (
                          <p className={styles.timelineBody}>
                            por <strong className={styles.timelineBold}>{item.authorName}</strong>
                          </p>
                        )}

                        {item.kind === 'assignment' && (
                          <div className={styles.timelineDetail}>
                            {item.fromName} →{' '}
                            <strong className={styles.timelineBold}>{item.toName}</strong>
                          </div>
                        )}

                        {item.kind === 'proposal' && item.text && (
                          <div className={styles.timelineDetail}>{item.text}</div>
                        )}

                        {item.kind === 'comment' && item.text && (
                          <div className={styles.timelineCommentMsg}>{item.text}</div>
                        )}

                        {item.kind === 'created' && item.source && (
                          <div className={styles.timelineSource}>
                            <TagIcon />
                            Origem: {item.source}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.commentInput}>
                  <img
                    src={currentUser?.avatarUrl ?? '/default-avatar.svg'}
                    alt={currentUser?.name ?? 'Você'}
                    className={styles.commentAvatar}
                  />
                  <input
                    type="text"
                    placeholder="Adicionar comentário ou nota interna..."
                    className={styles.commentField}
                    value={comment}
                    disabled={createComment.isPending}
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
                    disabled={createComment.isPending}
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

      {taskDetail && (
        <TaskModal
          task={taskDetail}
          leadName={card.name}
          members={members}
          onClose={() => setTaskDetail(null)}
          onConcluir={() => {
            updateTaskMutation.mutate(
              { id: taskDetail.id, payload: { status: 'concluida' } },
              { onSuccess: () => setTaskDetail(null) },
            )
          }}
          onExcluir={() => {
            deleteTaskMutation.mutate(taskDetail.id, { onSuccess: () => setTaskDetail(null) })
          }}
          onEdit={() => {
            setEditingLeadTask(taskDetail)
            setTaskDetail(null)
          }}
          onSaveNotes={(notes) =>
            updateTaskMutation.mutate(
              { id: taskDetail.id, payload: { notes } },
              { onSuccess: (updated) => setTaskDetail(updated) },
            )
          }
        />
      )}

      {taskFormOpen && currentUser && (
        <TaskFormModal
          mode="create"
          fixedLeadId={card.id}
          fixedLeadLabel={card.name}
          leadOptions={[]}
          members={members}
          currentUserId={currentUser.id}
          canAssign={canAssignTask}
          onClose={() => setTaskFormOpen(false)}
          onSubmit={(payload) => {
            createTask.mutate(payload as CreateTaskPayload, {
              onSuccess: () => setTaskFormOpen(false),
              onError: (error) => {
                toast({
                  type: 'error',
                  title: 'Não foi possível criar a tarefa',
                  description: error instanceof Error ? error.message : undefined,
                })
              },
            })
          }}
          isSubmitting={createTask.isPending}
        />
      )}

      {editingLeadTask && currentUser && (
        <TaskFormModal
          mode="edit"
          initialTask={editingLeadTask}
          fixedLeadId={card.id}
          fixedLeadLabel={card.name}
          leadOptions={[]}
          members={members}
          currentUserId={currentUser.id}
          canAssign={canAssignTask}
          onClose={() => setEditingLeadTask(null)}
          onSubmit={(payload) => {
            updateTaskMutation.mutate(
              { id: editingLeadTask.id, payload: payload as UpdateTaskPayload },
              {
                onSuccess: () => setEditingLeadTask(null),
                onError: (error) => {
                  toast({
                    type: 'error',
                    title: 'Não foi possível salvar as alterações',
                    description: error instanceof Error ? error.message : undefined,
                  })
                },
              },
            )
          }}
          isSubmitting={updateTaskMutation.isPending}
        />
      )}

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

      {simulationFormOpen && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop dismiss
        <div
          onClick={() => setSimulationFormOpen(false)}
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
              width: 420,
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Nova Simulação</h2>
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 16px' }}>
              Tabela, entrada, prazo e parcelas valem só pra esta proposta.
              {qualificationGapFields.length > 0 &&
                ' Também falta completar a Ficha de Qualificação do cliente.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  htmlFor="sim-table-name"
                  style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}
                >
                  Nome da Tabela
                </label>
                <input
                  id="sim-table-name"
                  className={styles.attrInput}
                  placeholder="Ex: Tabela Imóvel 2026"
                  maxLength={120}
                  value={simulationParams.tableName}
                  onChange={(e) =>
                    setSimulationParams((prev) => ({ ...prev, tableName: e.target.value }))
                  }
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  htmlFor="sim-down-payment"
                  style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}
                >
                  Valor de Entrada
                </label>
                <input
                  id="sim-down-payment"
                  className={styles.attrInput}
                  inputMode="numeric"
                  placeholder="R$"
                  value={simulationParams.downPayment}
                  onChange={(e) =>
                    setSimulationParams((prev) => ({
                      ...prev,
                      downPayment: formatMoneyInput(e.target.value),
                    }))
                  }
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  htmlFor="sim-term-months"
                  style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}
                >
                  Quantidade de Meses
                </label>
                <input
                  id="sim-term-months"
                  className={styles.attrInput}
                  type="number"
                  min={1}
                  value={simulationParams.termMonths}
                  onChange={(e) =>
                    setSimulationParams((prev) => ({
                      ...prev,
                      termMonths: e.target.value.replace(/[^0-9]/g, ''),
                    }))
                  }
                />
              </div>
              <fieldset className={styles.simInstallments}>
                <legend className={styles.simInstallmentsLegend}>Valor das Parcelas</legend>
                {simulationParams.installmentRows.map((row, index) => {
                  const start = installmentRowStarts(simulationParams.installmentRows)[index]
                  const isLast = index === simulationParams.installmentRows.length - 1
                  const isOnly = simulationParams.installmentRows.length === 1
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: linhas sem id, só por posição
                    <div key={index} className={styles.simInstallmentRow}>
                      <span className={styles.simInstallmentText}>
                        {isOnly
                          ? 'Todas as parcelas'
                          : isLast
                            ? `Da ${start}ª em diante`
                            : `Da ${start}ª até a`}
                      </span>
                      {!isLast && (
                        <input
                          aria-label={`Faixa ${index + 1}: até a parcela`}
                          className={`${styles.attrInput} ${styles.simInstallmentUntil}`}
                          inputMode="numeric"
                          placeholder="12"
                          value={row.until}
                          onChange={(e) =>
                            updateInstallmentRow(index, {
                              until: e.target.value.replace(/[^0-9]/g, ''),
                            })
                          }
                        />
                      )}
                      <input
                        aria-label={`Faixa ${index + 1}: valor da parcela`}
                        className={`${styles.attrInput} ${styles.simInstallmentAmount}`}
                        inputMode="numeric"
                        placeholder="R$"
                        value={row.amount}
                        onChange={(e) =>
                          updateInstallmentRow(index, { amount: formatMoneyInput(e.target.value) })
                        }
                      />
                      {!isOnly && (
                        <button
                          type="button"
                          className={styles.simInstallmentRemove}
                          aria-label={`Remover faixa ${index + 1}`}
                          onClick={() => removeInstallmentRow(index)}
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  )
                })}
                <button
                  type="button"
                  className={styles.simInstallmentAdd}
                  onClick={addInstallmentRow}
                  disabled={simulationParams.installmentRows.length >= 24}
                >
                  <PlusIcon />
                  Valor diferente a partir de uma parcela
                </button>
              </fieldset>
              {qualificationGapFields.map((def) => (
                <div key={def.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label
                    htmlFor={`gap-${def.key}`}
                    style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}
                  >
                    {def.label}
                  </label>
                  {def.key === 'maritalStatus' ? (
                    <select
                      id={`gap-${def.key}`}
                      className={styles.attrInput}
                      value={gapForm.maritalStatus}
                      onChange={(e) => updateGapField('maritalStatus', e.target.value)}
                    >
                      <option value="">Selecione…</option>
                      {MARITAL_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : def.key === 'cpf' ? (
                    <input
                      id={`gap-${def.key}`}
                      className={styles.attrInput}
                      placeholder="000.000.000-00"
                      value={gapForm.cpf}
                      onChange={(e) => updateGapField('cpf', formatCPF(e.target.value))}
                    />
                  ) : def.key === 'income' ? (
                    <input
                      id={`gap-${def.key}`}
                      className={styles.attrInput}
                      inputMode="numeric"
                      placeholder="R$"
                      value={gapForm.income}
                      onChange={(e) => updateGapField('income', formatMoneyInput(e.target.value))}
                    />
                  ) : (
                    <input
                      id={`gap-${def.key}`}
                      className={styles.attrInput}
                      value={gapForm.profession}
                      onChange={(e) => updateGapField('profession', e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setSimulationFormOpen(false)}
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
                onClick={handleSubmitSimulationForm}
                disabled={updateLead.isPending}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#0b1c30',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {updateLead.isPending ? 'Salvando…' : 'Simular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
