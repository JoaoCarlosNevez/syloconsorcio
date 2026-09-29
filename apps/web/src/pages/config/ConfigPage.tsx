// ConfigPage — Configurações com três sub-páginas: Hub, Equipe, Plano e Cobrança

import { OrganizationAvatar, Skeleton } from '@sylocrm/ui'
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import { useActivityQuery } from '../../hooks/useActivity'
import { useBrowserNotificationPermission } from '../../hooks/useBrowserNotificationPermission'
import { useChangePassword } from '../../hooks/useChangePassword'
import {
  type NotificationPreferences,
  useCurrentUser,
  useUpdateMyProfile,
} from '../../hooks/useCurrentUser'
import { useActiveOrganization } from '../../hooks/useOrganization'
import {
  useOrganizationSettingsQuery,
  useUpdateOrganizationBranding,
  useUpdateOrganizationSettings,
  useUploadOrganizationSettingsIcon,
} from '../../hooks/useOrganizationSettings'
import {
  useInviteTeamMember,
  useReactivateTeamMember,
  useRemoveTeamMember,
  useTeamMembersQuery,
  useUpdateTeamMemberSalesGoal,
} from '../../hooks/useTeam'
import type { ActivityEntityType, ActivityEntry } from '../../lib/activity-api'
import {
  ACTIVITY_CATEGORY,
  activityActorName,
  activityDayLabel,
  activityTimeLabel,
  describeActivity,
} from '../../lib/activity-format'
import type { BrowserNotificationPermission } from '../../lib/browser-notifications'
import { validateIconFile } from '../../lib/icon-validation'
import { formatBRL } from '../../lib/lead-adapters'
import { playNotificationSound } from '../../lib/notification-sound'
import type { NotificationType } from '../../lib/notifications-api'
import { formatGoalInput, goalInputToCents } from '../../lib/sales-goals'
import type { InvitableRole, TeamMember } from '../../lib/team-api'
import styles from './ConfigPage.module.css'
import { FunnelsSection } from './FunnelsSection'
import { IntegracoesSection } from './IntegracoesSection'

// ── Ícones ──────────────────────────────────────────────────────────────────────

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
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

function PlusIcon() {
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
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function XIcon() {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
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

function SettingsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function ActivityIcon() {
  return (
    <svg
      width="18"
      height="18"
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

function OrgIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="7" width="7" height="7" rx="1" />
      <rect x="15" y="7" width="7" height="7" rx="1" />
      <rect x="8.5" y="2" width="7" height="5" rx="1" />
      <line x1="12" y1="7" x2="12" y2="14" />
      <line x1="5.5" y1="14" x2="18.5" y2="14" />
    </svg>
  )
}

function CreditCardIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
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

function CheckCircleIcon() {
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
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

// ── Types ────────────────────────────────────────────────────────────────────────

type View =
  | 'hub'
  | 'equipe'
  | 'plano'
  | 'preferencias'
  | 'notificacoes'
  | 'seguranca'
  | 'organizacao'
  | 'atividade'
  | 'integracoes'

const ROLE_LABEL: Record<TeamMember['role'], string> = {
  ADMIN: 'Dono',
  MANAGER: 'Supervisor',
  SELLER: 'Vendedor',
}

const ROLE_DESCRIPTION: Record<InvitableRole, string> = {
  MANAGER: 'Convida vendedores e gerencia a equipe',
  SELLER: 'Opera o funil de leads',
}

// Um Role só convida papéis estritamente abaixo do seu (AGENTS.md §7,
// espelhado no backend por canGrantRole).
const INVITABLE_ROLES_BY_ROLE: Record<string, InvitableRole[]> = {
  ADMIN: ['MANAGER', 'SELLER'],
  MANAGER: ['SELLER'],
  SELLER: [],
}

const ROLE_RANK: Record<TeamMember['role'], number> = { SELLER: 0, MANAGER: 1, ADMIN: 2 }

// Mesma regra de hierarquia usada pra convidar (canGrantRole no backend) —
// Dono remove/reativa Supervisor/Vendedor, Supervisor remove/reativa só
// Vendedor. Super Admin da plataforma ignora a hierarquia. A checagem real
// acontece no backend (RemoveTeamMemberUseCase/ReactivateTeamMemberUseCase);
// isto só decide o que mostrar na UI.
function canManageMember(
  viewerRole: TeamMember['role'],
  viewerIsPlatformAdmin: boolean,
  targetRole: TeamMember['role'],
): boolean {
  if (viewerIsPlatformAdmin) return true
  return ROLE_RANK[viewerRole] > ROLE_RANK[targetRole]
}

function roleBadgeClass(role: TeamMember['role']) {
  if (role === 'ADMIN') return styles.roleAdmin
  if (role === 'MANAGER') return styles.roleSupervisor
  return styles.roleMember
}

function statusLabel(status: TeamMember['status']) {
  if (status === 'ACTIVE') return 'Ativo'
  if (status === 'INVITED') return 'Convidado'
  return 'Desativado'
}

function statusDotClass(status: TeamMember['status']) {
  if (status === 'ACTIVE') return styles.dotAtivo
  if (status === 'INVITED') return styles.dotPendente
  return styles.dotInativo
}

function statusLabelClass(status: TeamMember['status']) {
  if (status === 'ACTIVE') return styles.statusAtivo
  if (status === 'INVITED') return styles.statusPendente
  return styles.statusInativo
}

/** "Carlos Mendes" → "CM"; sem nome (convite ainda não aceito), usa o e-mail. */
function initialsForMember(member: TeamMember): string {
  const source = member.name?.trim() || member.email
  const words = source.split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return (words[0]?.[0] ?? '?').toUpperCase()
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase()
}

const INVOICES = [
  { id: '#2024-011', date: '01/11/2024', amount: 'R$ 499,00', status: 'Pago' },
  { id: '#2024-010', date: '01/10/2024', amount: 'R$ 499,00', status: 'Pago' },
  { id: '#2024-009', date: '01/09/2024', amount: 'R$ 499,00', status: 'Pago' },
  { id: '#2024-008', date: '01/08/2024', amount: 'R$ 499,00', status: 'Pago' },
]

// ── Hub view ─────────────────────────────────────────────────────────────────────

interface HubNavItem {
  label: string
  description: string
  icon: React.ReactNode
  view: View
}

const MINHA_CONTA_ITEMS: HubNavItem[] = [
  {
    label: 'Preferências',
    description: 'Idioma, fuso horário e aparência',
    icon: <SettingsIcon />,
    view: 'preferencias',
  },
  {
    label: 'Notificações',
    description: 'E-mail, push e alertas do sistema',
    icon: <BellIcon />,
    view: 'notificacoes',
  },
  {
    label: 'Segurança',
    description: 'Senha, 2FA e sessões ativas',
    icon: <ShieldIcon />,
    view: 'seguranca',
  },
]

function PlugIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 2v6" />
      <path d="M15 2v6" />
      <path d="M6 8h12v4a6 6 0 0 1-12 0V8z" />
      <path d="M12 18v4" />
    </svg>
  )
}

const ORG_ITEMS: HubNavItem[] = [
  {
    label: 'Organização',
    description: 'Nome, logo e dados da empresa',
    icon: <OrgIcon />,
    view: 'organizacao',
  },
  {
    label: 'Equipe',
    description: 'Gerencie usuários e permissões',
    icon: <UsersIcon />,
    view: 'equipe',
  },
  {
    label: 'Atividade',
    description: 'Log de ações e auditoria',
    icon: <ActivityIcon />,
    view: 'atividade',
  },
  {
    label: 'Integrações',
    description: 'Chaves de API e webhook de leads',
    icon: <PlugIcon />,
    view: 'integracoes',
  },
]

/** Integrações só aparece pra quem pode gerenciar chaves (Dono). */
const INTEGRATIONS_PERMISSION = 'integration.manage'

/** Telas de "Minha Conta" — as únicas que o Vendedor vê (ver ConfigPage). */
const ACCOUNT_VIEWS: ReadonlySet<View> = new Set<View>([
  'hub',
  'preferencias',
  'notificacoes',
  'seguranca',
])

function HubView({
  onNavigate,
  showOrganization,
}: {
  onNavigate: (v: View) => void
  /** Seções Organização e Plano e Cobrança — escondidas pro Vendedor. */
  showOrganization: boolean
}) {
  const { membership } = useActiveOrganization()
  const canManageIntegrations = membership?.permissions.includes(INTEGRATIONS_PERMISSION) ?? false
  const orgItems = ORG_ITEMS.filter((item) => item.view !== 'integracoes' || canManageIntegrations)

  return (
    <div className={styles.hubContent}>
      {/* Minha Conta */}
      <section className={styles.hubSection}>
        <div className={styles.hubSectionHeader}>
          <span className={styles.hubSectionLabel}>Minha Conta</span>
        </div>
        <div className={styles.hubCard}>
          {MINHA_CONTA_ITEMS.map((item, i) => (
            <button
              key={item.view}
              type="button"
              className={`${styles.hubNavItem} ${i < MINHA_CONTA_ITEMS.length - 1 ? styles.hubNavItemBorder : ''}`}
              onClick={() => onNavigate(item.view)}
            >
              <span className={styles.hubNavIcon}>{item.icon}</span>
              <span className={styles.hubNavText}>
                <span className={styles.hubNavLabel}>{item.label}</span>
                <span className={styles.hubNavDesc}>{item.description}</span>
              </span>
              <span className={styles.hubNavChevron}>
                <ChevronRightIcon />
              </span>
            </button>
          ))}
        </div>
      </section>

      {showOrganization && (
        <>
          {/* Organização */}
          <section className={styles.hubSection}>
            <div className={styles.hubSectionHeader}>
              <span className={styles.hubSectionLabel}>Organização</span>
            </div>
            <div className={styles.hubCard}>
              {orgItems.map((item, i) => (
                <button
                  key={item.view}
                  type="button"
                  className={`${styles.hubNavItem} ${i < orgItems.length - 1 ? styles.hubNavItemBorder : ''}`}
                  onClick={() => onNavigate(item.view)}
                >
                  <span className={styles.hubNavIcon}>{item.icon}</span>
                  <span className={styles.hubNavText}>
                    <span className={styles.hubNavLabel}>{item.label}</span>
                    <span className={styles.hubNavDesc}>{item.description}</span>
                  </span>
                  <span className={styles.hubNavChevron}>
                    <ChevronRightIcon />
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Plano e Cobrança */}
          <section className={styles.hubSection}>
            <div className={styles.hubSectionHeader}>
              <span className={styles.hubSectionLabel}>Plano e Cobrança</span>
            </div>
            <div className={styles.hubCard}>
              <button
                type="button"
                className={styles.hubNavItem}
                onClick={() => onNavigate('plano')}
              >
                <span className={styles.hubNavIcon}>
                  <CreditCardIcon />
                </span>
                <span className={styles.hubNavText}>
                  <span className={styles.hubNavLabel}>Plano e Cobrança</span>
                  <span className={styles.hubNavDesc}>
                    Plano Pro ativo · Próxima cobrança em 01/12/2024
                  </span>
                </span>
                <span className={styles.hubPlanBadge}>PRO</span>
                <span className={styles.hubNavChevron}>
                  <ChevronRightIcon />
                </span>
              </button>
            </div>
          </section>
        </>
      )}

      {/* Footer */}
      <div className={styles.hubFooter}>
        <span className={styles.hubVersion}>SyloCRM v2.0.0</span>
        <span className={styles.hubFooterDot}>·</span>
        <a
          href="https://sylocrm.com/termos"
          target="_blank"
          rel="noreferrer"
          className={styles.hubFooterLink}
        >
          Termos de uso
        </a>
        <span className={styles.hubFooterDot}>·</span>
        <a
          href="https://sylocrm.com/privacidade"
          target="_blank"
          rel="noreferrer"
          className={styles.hubFooterLink}
        >
          Política de privacidade
        </a>
        <span className={styles.hubFooterDot}>·</span>
        <a href="mailto:suporte@sylocrm.com" className={styles.hubFooterLink}>
          Suporte
        </a>
      </div>
    </div>
  )
}

// ── Equipe view ──────────────────────────────────────────────────────────────────

const PER_PAGE = 5

function EquipeView() {
  const { organizationId, membership } = useActiveOrganization()
  const { data: currentUser } = useCurrentUser()
  const { data, isLoading } = useTeamMembersQuery(organizationId)
  const removeMember = useRemoveTeamMember(organizationId)
  const reactivateMember = useReactivateTeamMember(organizationId)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null)
  const [detailUserId, setDetailUserId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const invitableRoles = membership ? (INVITABLE_ROLES_BY_ROLE[membership.role] ?? []) : []
  const canInvite = invitableRoles.length > 0
  const isPlatformAdmin = currentUser?.isPlatformAdmin ?? false

  async function handleConfirmRemove() {
    if (!removeTarget) return
    try {
      await removeMember.mutateAsync(removeTarget.userId)
      setToast(`${removeTarget.name ?? removeTarget.email} desativado da equipe.`)
      setRemoveTarget(null)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Não foi possível remover o usuário.')
      setRemoveTarget(null)
    }
  }

  async function handleReactivate(member: TeamMember) {
    try {
      await reactivateMember.mutateAsync(member.userId)
      setToast(`${member.name ?? member.email} reativado na equipe.`)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Não foi possível reativar o usuário.')
    }
  }

  const members = data?.members ?? []
  const detailMember = members.find((m) => m.userId === detailUserId) ?? null
  const filtered = members.filter(
    (m) =>
      (m.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className={styles.equipeContent}>
      {/* Toolbar */}
      <div className={styles.equipeToolbar}>
        <div className={styles.equipeSearch}>
          <span className={styles.equipeSearchIcon}>
            <SearchIcon />
          </span>
          <input
            className={styles.equipeSearchInput}
            type="text"
            placeholder="Buscar usuário..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        {canInvite && (
          <div className={styles.equipeToolbarRight}>
            <button type="button" className={styles.addUserBtn} onClick={() => setInviteOpen(true)}>
              <PlusIcon />
              Adicionar usuário
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHead}>
              <th className={styles.thUser}>USUÁRIO</th>
              <th className={styles.th}>FUNÇÃO</th>
              <th className={styles.th}>STATUS</th>
              <th className={styles.th}>META DE VENDAS</th>
              <th className={styles.th} />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className={styles.td} colSpan={5}>
                  Carregando…
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td className={styles.td} colSpan={5}>
                  Nenhum membro encontrado.
                </td>
              </tr>
            ) : (
              paged.map((member) => {
                const manageable =
                  member.userId !== currentUser?.id &&
                  membership !== null &&
                  canManageMember(membership.role, isPlatformAdmin, member.role)
                return (
                  // biome-ignore lint/a11y/useKeyWithClickEvents: atalho de mouse — pelo teclado o detalhe abre no botão do nome
                  <tr
                    key={member.userId}
                    className={`${styles.tableRow} ${styles.tableRowClickable}`}
                    onClick={() => setDetailUserId(member.userId)}
                  >
                    <td className={styles.tdUser}>
                      <span className={styles.avatar}>{initialsForMember(member)}</span>
                      <button
                        type="button"
                        className={styles.userInfoBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          setDetailUserId(member.userId)
                        }}
                      >
                        <span className={styles.userName}>{member.name ?? '—'}</span>
                        <span className={styles.userEmail}>{member.email}</span>
                      </button>
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.roleBadge} ${roleBadgeClass(member.role)}`}>
                        {ROLE_LABEL[member.role]}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.statusCell}>
                        <span className={`${styles.statusDot} ${statusDotClass(member.status)}`} />
                        <span
                          className={`${styles.statusLabel} ${statusLabelClass(member.status)}`}
                        >
                          {statusLabel(member.status)}
                        </span>
                      </span>
                    </td>
                    <td className={styles.td}>
                      {member.salesGoalCents !== null ? (
                        <span className={styles.goalValue}>
                          R$ {formatBRL(member.salesGoalCents)}
                        </span>
                      ) : (
                        <span className={styles.goalEmpty}>Sem meta</span>
                      )}
                    </td>
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: só impede que o clique nas ações abra o detalhe */}
                    <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                      {manageable && member.status === 'SUSPENDED' && (
                        <button
                          type="button"
                          className={styles.reactivateMemberBtn}
                          onClick={() => handleReactivate(member)}
                          disabled={reactivateMember.isPending}
                        >
                          Reativar
                        </button>
                      )}
                      {manageable && member.status !== 'SUSPENDED' && (
                        <button
                          type="button"
                          className={styles.removeMemberBtn}
                          onClick={() => setRemoveTarget(member)}
                        >
                          Remover
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {inviteOpen && organizationId && (
        <InviteModal
          organizationId={organizationId}
          invitableRoles={invitableRoles}
          onClose={() => setInviteOpen(false)}
        />
      )}

      {detailMember && organizationId && (
        <MemberDetailModal
          organizationId={organizationId}
          member={detailMember}
          canEditGoal={
            isPlatformAdmin ||
            (detailMember.userId !== currentUser?.id &&
              membership !== null &&
              canManageMember(membership.role, false, detailMember.role))
          }
          onSaved={(msg) => setToast(msg)}
          onClose={() => setDetailUserId(null)}
        />
      )}

      {removeTarget && (
        <RemoveMemberModal
          member={removeTarget}
          isPending={removeMember.isPending}
          onConfirm={handleConfirmRemove}
          onClose={() => setRemoveTarget(null)}
        />
      )}

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            Mostrando {Math.min(page * PER_PAGE, filtered.length)} de {filtered.length} usuários
          </span>
          <div className={styles.paginationControls}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeftIcon />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 500,
        background: '#0b1c30',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 500,
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={2.5}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {msg}
    </div>
  )
}

// ── CancelModal ───────────────────────────────────────────────────────────────

function CancelModal({ onClose }: { onClose: () => void }) {
  const [reason, setReason] = useState('')
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onClose()
  }
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop dismiss
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(11,28,48,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal stops propagation */}
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 460,
          boxShadow: '0 8px 40px rgba(11,28,48,0.18)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '22px 24px', borderBottom: '1px solid rgba(216,195,173,0.3)' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#ba1a1a' }}>
            Cancelar assinatura
          </span>
          <p style={{ fontSize: 13, color: '#565e74', margin: '8px 0 0', lineHeight: 1.5 }}>
            Ao cancelar, você mantém acesso até o fim do período pago. Após isso, sua conta será
            desativada.
          </p>
        </div>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24 }}
          onSubmit={handleSubmit}
        >
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#565e74',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.02em',
            }}
          >
            Motivo (opcional)
            <textarea
              style={{
                border: '1px solid rgba(216,195,173,0.4)',
                borderRadius: 8,
                padding: '10px 12px',
                fontFamily: 'inherit',
                fontSize: 14,
                color: '#0b1c30',
                background: '#f8f9ff',
                outline: 'none',
                resize: 'vertical',
                minHeight: 80,
              }}
              placeholder="Conte por que está cancelando..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'none',
                border: '1px solid rgba(216,195,173,0.5)',
                borderRadius: 8,
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 500,
                color: '#565e74',
                cursor: 'pointer',
              }}
            >
              Manter assinatura
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 18px',
                background: '#ba1a1a',
                border: 'none',
                borderRadius: 8,
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Confirmar cancelamento
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Plano e Cobrança view ────────────────────────────────────────────────────────

function PlanoView() {
  const [cancelModal, setCancelModal] = useState(false)
  const [toast, setToast] = useState('')
  return (
    <div className={styles.planoContent}>
      {/* Plan card */}
      <div className={styles.planCard}>
        <div className={styles.planCardLeft}>
          <div className={styles.planBadgeWrap}>
            <span className={styles.planBadge}>PLANO PRO</span>
          </div>
          <div className={styles.planPrice}>
            <span className={styles.planAmount}>R$ 499</span>
            <span className={styles.planPeriod}>/mês</span>
          </div>
          <p className={styles.planDesc}>
            Inclui até 15 usuários, todas as integrações e suporte prioritário.
          </p>
        </div>
        <div className={styles.planCardRight}>
          <div className={styles.licenseBar}>
            <div className={styles.licenseBarHeader}>
              <span className={styles.licenseLabel}>Licenças utilizadas</span>
              <span className={styles.licenseCount}>12 / 15</span>
            </div>
            <div className={styles.licenseTrack}>
              <div className={styles.licenseFill} style={{ width: '80%' }} />
            </div>
            <span className={styles.licenseHint}>3 licenças disponíveis</span>
          </div>
        </div>
      </div>

      {/* Billing panels */}
      <div className={styles.billingPanels}>
        <div className={styles.billingPanel}>
          <span className={styles.billingPanelTitle}>Próxima cobrança</span>
          <span className={styles.billingPanelValue}>01/12/2024</span>
          <span className={styles.billingPanelSub}>R$ 499,00 · Pix automático</span>
        </div>
        <div className={styles.billingPanel}>
          <span className={styles.billingPanelTitle}>Forma de pagamento</span>
          <span className={styles.billingPanelValue}>Pix recorrente</span>
          <button type="button" className={styles.billingChangeBtn}>
            Alterar forma de pagamento
          </button>
        </div>
      </div>

      {/* Invoice history */}
      <div className={styles.invoiceCard}>
        <div className={styles.invoiceHeader}>
          <span className={styles.invoiceTitle}>Histórico de cobranças</span>
        </div>
        <table className={styles.invoiceTable}>
          <thead>
            <tr className={styles.invoiceHead}>
              <th className={styles.invTh}>FATURA</th>
              <th className={styles.invTh}>DATA</th>
              <th className={styles.invTh}>VALOR</th>
              <th className={styles.invTh}>STATUS</th>
              <th className={styles.invTh} />
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((inv) => (
              <tr key={inv.id} className={styles.invoiceRow}>
                <td className={styles.invTd}>{inv.id}</td>
                <td className={styles.invTd}>{inv.date}</td>
                <td className={styles.invTd}>{inv.amount}</td>
                <td className={styles.invTd}>
                  <span className={styles.invoicePaid}>
                    <CheckCircleIcon />
                    {inv.status}
                  </span>
                </td>
                <td className={styles.invTd}>
                  <button
                    type="button"
                    className={styles.downloadBtn}
                    onClick={() => setToast('PDF em breve disponível')}
                  >
                    <DownloadIcon />
                    Baixar PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cancel */}
      <div className={styles.cancelSection}>
        <div className={styles.cancelText}>
          <span className={styles.cancelTitle}>Cancelar assinatura</span>
          <span className={styles.cancelDesc}>
            Ao cancelar, seu acesso será mantido até o fim do período pago. Após isso, a conta será
            desativada.
          </span>
        </div>
        <button type="button" className={styles.cancelBtn} onClick={() => setCancelModal(true)}>
          Cancelar assinatura
        </button>
      </div>

      {cancelModal && <CancelModal onClose={() => setCancelModal(false)} />}
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}

// ── Preferências view ─────────────────────────────────────────────────────────────

function PreferenciasView() {
  const [theme, setThemeLocal] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('sylo-theme') as 'light' | 'dark') ?? 'light',
  )
  const [language, setLanguage] = useState('pt-BR')
  const [timezone, setTimezone] = useState('America/Sao_Paulo')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [toast, setToast] = useState('')

  function applyTheme(t: 'light' | 'dark') {
    setThemeLocal(t)
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('sylo-theme', t)
  }

  function handleSave(e: FormEvent) {
    e.preventDefault()
    setToast('Preferências salvas com sucesso!')
  }

  return (
    <div className={styles.settingsContent}>
      <form onSubmit={handleSave} style={{ display: 'contents' }}>
        {/* Aparência */}
        <div className={styles.settingsCard}>
          <div className={styles.settingsCardHeader}>
            <div className={styles.settingsCardTitle}>Aparência</div>
            <div className={styles.settingsCardDesc}>Escolha o tema da interface</div>
          </div>
          <div className={styles.settingsCardBody}>
            <div className={styles.themeGrid}>
              <button
                type="button"
                className={`${styles.themeOption} ${theme === 'light' ? styles.themeOptionActive : ''}`}
                onClick={() => applyTheme('light')}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                Claro
              </button>
              <button
                type="button"
                className={`${styles.themeOption} ${theme === 'dark' ? styles.themeOptionActive : ''}`}
                onClick={() => applyTheme('dark')}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                Escuro
              </button>
            </div>
          </div>
        </div>

        {/* Região */}
        <div className={styles.settingsCard}>
          <div className={styles.settingsCardHeader}>
            <div className={styles.settingsCardTitle}>Região e idioma</div>
            <div className={styles.settingsCardDesc}>Idioma, fuso horário e formato de data</div>
          </div>
          <div className={styles.settingsCardBody}>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="pref-language">
                Idioma
              </label>
              <select
                id="pref-language"
                className={styles.formSelect}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es">Español</option>
              </select>
            </div>
            <div className={styles.formRowHalf}>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="pref-timezone">
                  Fuso horário
                </label>
                <select
                  id="pref-timezone"
                  className={styles.formSelect}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option value="America/Sao_Paulo">America/São_Paulo (UTC−3)</option>
                  <option value="America/Manaus">America/Manaus (UTC−4)</option>
                  <option value="America/Fortaleza">America/Fortaleza (UTC−3)</option>
                  <option value="America/Belem">America/Belém (UTC−3)</option>
                </select>
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="pref-date">
                  Formato de data
                </label>
                <select
                  id="pref-date"
                  className={styles.formSelect}
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                >
                  <option value="DD/MM/YYYY">DD/MM/AAAA</option>
                  <option value="MM/DD/YYYY">MM/DD/AAAA</option>
                  <option value="YYYY-MM-DD">AAAA-MM-DD</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.saveRow}>
          <button type="submit" className={styles.primaryBtn}>
            Salvar preferências
          </button>
        </div>
      </form>

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}

// ── Segurança view ─────────────────────────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: '', color: '#e2e8f0' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score: 20, label: 'Muito fraca', color: '#ef4444' }
  if (score === 2) return { score: 40, label: 'Fraca', color: '#f97316' }
  if (score === 3) return { score: 60, label: 'Razoável', color: '#f59e0b' }
  if (score === 4) return { score: 80, label: 'Forte', color: '#22c55e' }
  return { score: 100, label: 'Muito forte', color: '#15803d' }
}

const SESSIONS = [
  {
    id: '1',
    device: 'Chrome — Windows 11',
    location: 'São Paulo, BR',
    time: 'Agora',
    current: true,
  },
  {
    id: '2',
    device: 'Safari — iPhone 15',
    location: 'São Paulo, BR',
    time: 'Há 2 dias',
    current: false,
  },
  {
    id: '3',
    device: 'Firefox — macOS',
    location: 'Rio de Janeiro, BR',
    time: 'Há 7 dias',
    current: false,
  },
]

function MonitorIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

function SmartphoneIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  )
}

function SegurancaView() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [sessions, setSessions] = useState(SESSIONS)

  const changePassword = useChangePassword()

  const strength = passwordStrength(next)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!current) {
      setError('Informe a senha atual.')
      return
    }
    if (next.length < 8) {
      setError('Nova senha deve ter ao menos 8 caracteres.')
      return
    }
    if (next === current) {
      setError('A nova senha precisa ser diferente da atual.')
      return
    }
    if (next !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    try {
      await changePassword.mutateAsync({ currentPassword: current, newPassword: next })
      setCurrent('')
      setNext('')
      setConfirm('')
      setToast('Senha alterada! As sessões em outros dispositivos foram encerradas.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível trocar a senha.')
    }
  }

  function revokeSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    setToast('Sessão encerrada.')
  }

  return (
    <div className={styles.settingsContent}>
      {/* Trocar senha */}
      <div className={styles.settingsCard}>
        <div className={styles.settingsCardHeader}>
          <div className={styles.settingsCardTitle}>Trocar senha</div>
          <div className={styles.settingsCardDesc}>
            Use uma senha forte com pelo menos 8 caracteres
          </div>
        </div>
        <div className={styles.settingsCardBody}>
          <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="sec-current">
                Senha atual
              </label>
              <input
                id="sec-current"
                type="password"
                autoComplete="current-password"
                disabled={changePassword.isPending}
                className={styles.formInput}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="••••••••"
                style={{ maxWidth: 340 }}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="sec-next">
                Nova senha
              </label>
              <input
                id="sec-next"
                type="password"
                autoComplete="new-password"
                disabled={changePassword.isPending}
                className={styles.formInput}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                style={{ maxWidth: 340 }}
              />
              {next.length > 0 && (
                <div className={styles.strengthWrap}>
                  <div className={styles.strengthTrack}>
                    <div
                      className={styles.strengthFill}
                      style={{ width: `${strength.score}%`, background: strength.color }}
                    />
                  </div>
                  <span className={styles.strengthLabel} style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="sec-confirm">
                Confirmar nova senha
              </label>
              <input
                id="sec-confirm"
                type="password"
                autoComplete="new-password"
                disabled={changePassword.isPending}
                className={styles.formInput}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a nova senha"
                style={{ maxWidth: 340 }}
              />
            </div>
            {error && (
              <span className={styles.formError} role="alert">
                {error}
              </span>
            )}
            <div className={styles.saveRow}>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={changePassword.isPending}
              >
                {changePassword.isPending ? 'Alterando…' : 'Alterar senha'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Autenticação de dois fatores */}
      <div className={styles.settingsCard}>
        <div className={styles.settingsCardHeader}>
          <div className={styles.settingsCardTitle}>Autenticação em dois fatores</div>
          <div className={styles.settingsCardDesc}>
            Adicione uma camada extra de proteção à sua conta
          </div>
        </div>
        <div className={styles.settingsCardBody}>
          <div className={styles.twoFaRow}>
            <div>
              <div style={{ fontSize: 'var(--cfg-text-sm)', fontWeight: 600, color: '#0b1c30' }}>
                Aplicativo autenticador
              </div>
              <div style={{ fontSize: 'var(--cfg-text-xs)', color: '#94a3b8', marginTop: 2 }}>
                Google Authenticator, Authy ou similar
              </div>
            </div>
            <span className={styles.twoFaBadge}>Não configurado</span>
          </div>
          <button type="button" className={styles.secondaryBtn}>
            Configurar 2FA
          </button>
        </div>
      </div>

      {/* Sessões ativas */}
      <div className={styles.settingsCard}>
        <div className={styles.settingsCardHeader}>
          <div className={styles.settingsCardTitle}>Sessões ativas</div>
          <div className={styles.settingsCardDesc}>Dispositivos com acesso à sua conta agora</div>
        </div>
        <div className={styles.sessionList}>
          {sessions.map((s) => (
            <div key={s.id} className={styles.sessionItem}>
              <div className={styles.sessionIconWrap}>
                {s.device.includes('iPhone') ? <SmartphoneIcon /> : <MonitorIcon />}
              </div>
              <div className={styles.sessionInfo}>
                <div className={styles.sessionDevice}>{s.device}</div>
                <div className={styles.sessionMeta}>
                  {s.location} · {s.time}
                </div>
              </div>
              {s.current ? (
                <span className={styles.sessionCurrent}>Sessão atual</span>
              ) : (
                <button
                  type="button"
                  className={styles.sessionKillBtn}
                  onClick={() => revokeSession(s.id)}
                >
                  Encerrar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}

// ── Notificações view ─────────────────────────────────────────────────────────────

const PUSH_EVENTS: { type: NotificationType; label: string; desc: string }[] = [
  {
    type: 'task.assigned',
    label: 'Tarefa atribuída a você',
    desc: 'Quando alguém cria ou passa uma tarefa pra você',
  },
  {
    type: 'task.due_soon',
    label: 'Tarefa perto do prazo',
    desc: '1 hora antes do vencimento',
  },
  {
    type: 'task.overdue',
    label: 'Tarefa atrasada',
    desc: 'Quando uma tarefa sua passa do prazo',
  },
  {
    type: 'task.completed',
    label: 'Tarefa concluída',
    desc: 'Quando outra pessoa conclui uma tarefa que você criou',
  },
  {
    type: 'lead.received',
    label: 'Novo lead pela API',
    desc: 'Lead atribuído a você, ou sem responsável (Dono e Supervisores)',
  },
]

function BrowserPermissionStatus({
  permission,
  onRequest,
}: {
  permission: BrowserNotificationPermission
  onRequest: () => void
}) {
  if (permission === 'granted') {
    return (
      <div className={styles.permissionRow}>
        <span className={`${styles.permissionBadge} ${styles.permissionGranted}`}>
          Permitidas neste navegador
        </span>
      </div>
    )
  }
  if (permission === 'denied') {
    return (
      <div className={styles.permissionRow}>
        <span className={`${styles.permissionBadge} ${styles.permissionDenied}`}>
          Bloqueadas pelo navegador
        </span>
        <p className={styles.permissionHint}>
          Pra liberar, clique no cadeado ao lado do endereço do site, permita “Notificações” e
          recarregue a página.
        </p>
      </div>
    )
  }
  if (permission === 'unsupported') {
    return (
      <div className={styles.permissionRow}>
        <span className={styles.permissionBadge}>Não suportadas</span>
        <p className={styles.permissionHint}>
          Este navegador não mostra notificações. O sininho e o aviso sonoro continuam funcionando.
        </p>
      </div>
    )
  }
  return (
    <div className={styles.permissionRow}>
      <span className={styles.permissionBadge}>Ainda não permitidas</span>
      <p className={styles.permissionHint}>
        O navegador vai perguntar se o CRM pode mostrar notificações.
      </p>
      <button type="button" className={styles.primaryBtn} onClick={onRequest}>
        Permitir notificações
      </button>
    </div>
  )
}

function NotificacoesView() {
  const { data: currentUser, isLoading } = useCurrentUser()
  const updateProfile = useUpdateMyProfile()
  const { permission, request } = useBrowserNotificationPermission()
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [toast, setToast] = useState('')

  // Estado local editável, inicializado quando o perfil chega.
  useEffect(() => {
    if (currentUser && !prefs) setPrefs(currentUser.notificationPreferences)
  }, [currentUser, prefs])

  async function handleRequestPermission() {
    const result = await request()
    if (result === 'granted') setToast('Notificações do navegador permitidas!')
    else if (result === 'denied') setToast('O navegador bloqueou as notificações.')
  }

  async function handleTestSound() {
    const played = await playNotificationSound()
    if (!played) setToast('Não foi possível tocar o som neste navegador.')
  }

  async function handleSave() {
    if (!prefs) return
    // Ligou algum push e o navegador ainda não perguntou: aproveita o clique.
    if (permission === 'default' && Object.values(prefs.push).some(Boolean)) {
      await request()
    }
    try {
      await updateProfile.mutateAsync({ notificationPreferences: prefs })
      setToast('Preferências de notificação salvas!')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Não foi possível salvar as preferências.')
    }
  }

  if (isLoading || !prefs) {
    return (
      <div className={styles.settingsContent}>
        <div className={styles.settingsCard}>
          <div className={styles.settingsCardBody}>
            <Skeleton variant="text" width="40%" height="16px" />
            <Skeleton variant="text" width="70%" height="12px" />
            <Skeleton variant="rect" width="100%" height="160px" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.settingsContent}>
      <div className={styles.settingsCard}>
        <div className={styles.settingsCardHeader}>
          <div className={styles.settingsCardTitle}>Notificações do navegador</div>
          <div className={styles.settingsCardDesc}>
            Avisos na tela do computador quando você estiver em outra aba ou programa, com o CRM
            aberto
          </div>
        </div>
        <div className={styles.settingsCardBody}>
          <BrowserPermissionStatus permission={permission} onRequest={handleRequestPermission} />
        </div>
      </div>

      <div className={styles.settingsCard}>
        <div className={styles.notifHeader}>
          <span className={styles.notifHeaderLabel}>Evento</span>
          <span className={styles.notifHeaderLabel}>Push</span>
        </div>
        {PUSH_EVENTS.map((event) => (
          <div key={event.type} className={styles.notifRow}>
            <div>
              <div className={styles.notifRowLabel}>{event.label}</div>
              <div className={styles.notifRowDesc}>{event.desc}</div>
            </div>
            <div className={styles.notifCell}>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  aria-label={`Push: ${event.label}`}
                  checked={prefs.push[event.type]}
                  onChange={() =>
                    setPrefs({
                      ...prefs,
                      push: { ...prefs.push, [event.type]: !prefs.push[event.type] },
                    })
                  }
                />
                <span className={styles.toggleTrack} />
                <span className={styles.toggleThumb} />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.settingsCard}>
        <div className={styles.notifRow}>
          <div>
            <div className={styles.notifRowLabel}>Aviso sonoro</div>
            <div className={styles.notifRowDesc}>Toca um som quando chega uma notificação nova</div>
          </div>
          <div className={styles.notifCell}>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                aria-label="Aviso sonoro"
                checked={prefs.sound}
                onChange={() => setPrefs({ ...prefs, sound: !prefs.sound })}
              />
              <span className={styles.toggleTrack} />
              <span className={styles.toggleThumb} />
            </label>
          </div>
        </div>
        <div className={styles.soundTestRow}>
          <button type="button" className={styles.secondaryBtn} onClick={handleTestSound}>
            Testar som
          </button>
        </div>
      </div>

      <div className={styles.saveRow}>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={handleSave}
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? 'Salvando…' : 'Salvar notificações'}
        </button>
      </div>

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}

// ── Organização view ───────────────────────────────────────────────────────────────

/** Âmbar da Sylo (--color-accent) — valor inicial do seletor de cor. */
const DEFAULT_SECONDARY_COLOR = '#ffa705'

function OrganizacaoView() {
  const { organizationId, membership } = useActiveOrganization()
  const { data, isLoading } = useOrganizationSettingsQuery(organizationId)
  const updateSettings = useUpdateOrganizationSettings(organizationId)
  const uploadIcon = useUploadOrganizationSettingsIcon(organizationId)
  const updateBranding = useUpdateOrganizationBranding(organizationId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [orgName, setOrgName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [website, setWebsite] = useState('')
  const [phone, setPhone] = useState('')
  const [orgGoal, setOrgGoal] = useState('')
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY_COLOR)
  const [newSegment, setNewSegment] = useState('')
  const [newSource, setNewSource] = useState('')
  const [newTag, setNewTag] = useState('')
  const [toast, setToast] = useState('')

  const organization = data?.organization
  const { data: teamData } = useTeamMembersQuery(organizationId)
  const teamGoalsSumCents = (teamData?.members ?? [])
    .filter((m) => m.status === 'ACTIVE')
    .reduce((sum, m) => sum + (m.salesGoalCents ?? 0), 0)
  const isAdmin = membership?.role === 'ADMIN'
  const canChangeLogo = isAdmin && organization?.isWhiteLabel === true

  // Sincroniza o formulário sempre que os dados reais chegam (ou mudam via refetch).
  useEffect(() => {
    if (!organization) return
    setOrgName(organization.name)
    setCnpj(organization.cnpj ?? '')
    setWebsite(organization.website ?? '')
    setPhone(organization.phone ?? '')
    setSecondaryColor(organization.branding?.secondaryColor ?? DEFAULT_SECONDARY_COLOR)
    setOrgGoal(
      organization.salesGoalCents !== null
        ? formatGoalInput(String(organization.salesGoalCents / 100))
        : '',
    )
  }, [organization])

  async function handleSaveColor(color: string | null) {
    try {
      await updateBranding.mutateAsync(color)
      setToast(color ? 'Cor secundária salva!' : 'Cor padrão da Sylo restaurada.')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Erro ao salvar a cor.')
    }
  }

  async function handleSaveGoal(e: FormEvent) {
    e.preventDefault()
    try {
      await updateSettings.mutateAsync({ salesGoalCents: goalInputToCents(orgGoal) })
      setToast('Meta da organização salva!')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Erro ao salvar a meta.')
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    try {
      await updateSettings.mutateAsync({
        name: orgName.trim(),
        cnpj: cnpj.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
      })
      setToast('Dados da organização salvos com sucesso!')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Erro ao salvar organização.')
    }
  }

  async function handleAddSegment(e: FormEvent) {
    e.preventDefault()
    const value = newSegment.trim()
    if (!value || !organization) return
    if (organization.leadSegments.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setToast('Esse tipo de crédito já está na lista.')
      return
    }
    try {
      await updateSettings.mutateAsync({ leadSegments: [...organization.leadSegments, value] })
      setNewSegment('')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Erro ao adicionar tipo de crédito.')
    }
  }

  async function handleRemoveSegment(segment: string) {
    if (!organization) return
    try {
      await updateSettings.mutateAsync({
        leadSegments: organization.leadSegments.filter((s) => s !== segment),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Erro ao remover tipo de crédito.')
    }
  }

  async function handleAddSource(e: FormEvent) {
    e.preventDefault()
    const value = newSource.trim()
    if (!value || !organization) return
    if (organization.leadSources.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setToast('Essa origem já está na lista.')
      return
    }
    try {
      await updateSettings.mutateAsync({ leadSources: [...organization.leadSources, value] })
      setNewSource('')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Erro ao adicionar origem.')
    }
  }

  async function handleRemoveSource(source: string) {
    if (!organization) return
    try {
      await updateSettings.mutateAsync({
        leadSources: organization.leadSources.filter((s) => s !== source),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Erro ao remover origem.')
    }
  }

  async function handleAddTag(e: FormEvent) {
    e.preventDefault()
    const value = newTag.trim()
    if (!value || !organization) return
    if (organization.leadTags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setToast('Essa tag já está na lista.')
      return
    }
    try {
      await updateSettings.mutateAsync({ leadTags: [...organization.leadTags, value] })
      setNewTag('')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Erro ao adicionar tag.')
    }
  }

  async function handleRemoveTag(tag: string) {
    if (!organization) return
    try {
      await updateSettings.mutateAsync({
        leadTags: organization.leadTags.filter((t) => t !== tag),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Erro ao remover tag.')
    }
  }

  async function handleIconChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const validationError = await validateIconFile(file)
    if (validationError) {
      setToast(validationError)
      return
    }

    try {
      await uploadIcon.mutateAsync(file)
      setToast('Ícone atualizado com sucesso!')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Erro ao enviar ícone.')
    }
  }

  if (isLoading || !organization) {
    return (
      <div className={styles.settingsContent}>
        <div className={styles.settingsCard}>
          <div className={styles.settingsCardBody}>Carregando…</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.settingsContent}>
      <div className={styles.settingsCard}>
        <div className={styles.settingsCardHeader}>
          <div className={styles.settingsCardTitle}>Identidade da organização</div>
          <div className={styles.settingsCardDesc}>
            {organization.isWhiteLabel
              ? 'Logo e nome público exibidos no sistema'
              : 'Sem ícone próprio, esta organização mostra um avatar com as iniciais do nome. Só o Super Admin pode ativar o White Label, pela tela de Administração.'}
          </div>
        </div>
        <div className={styles.settingsCardBody}>
          <div className={styles.logoUploadRow}>
            <div className={styles.logoPreview}>
              <OrganizationAvatar
                id={organization.id}
                name={organization.name}
                iconUrl={organization.isWhiteLabel ? organization.branding?.iconUrl : null}
                size={46}
              />
            </div>
            <div className={styles.logoUploadActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={!canChangeLogo}
              >
                Alterar logo
              </button>
              <span className={styles.formHint}>
                {canChangeLogo
                  ? 'PNG, JPEG, WEBP ou SVG · Quadrada · Máx. 2MB'
                  : 'Disponível apenas para organizações White Label'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                style={{ display: 'none' }}
                onChange={handleIconChange}
              />
            </div>
          </div>
          {organization.isWhiteLabel && (
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="org-secondary-color">
                Cor secundária
              </label>
              <div className={styles.colorPickerRow}>
                <input
                  id="org-secondary-color"
                  type="color"
                  className={styles.colorSwatchInput}
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  disabled={!isAdmin}
                />
                <span className={styles.colorHex}>{secondaryColor.toUpperCase()}</span>
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={() => handleSaveColor(secondaryColor)}
                      disabled={
                        updateBranding.isPending ||
                        secondaryColor === organization.branding?.secondaryColor
                      }
                    >
                      Salvar cor
                    </button>
                    {organization.branding?.secondaryColor && (
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => handleSaveColor(null)}
                        disabled={updateBranding.isPending}
                      >
                        Restaurar padrão
                      </button>
                    )}
                  </>
                )}
              </div>
              <span className={styles.formHint}>
                Substitui o laranja da Sylo em botões, menu, abas e destaques do sistema para todos
                os membros desta organização.
              </span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.settingsCard}>
        <div className={styles.settingsCardHeader}>
          <div className={styles.settingsCardTitle}>Dados da empresa</div>
          <div className={styles.settingsCardDesc}>
            {isAdmin
              ? 'Informações cadastrais da organização'
              : 'Apenas o dono da representação pode editar estes dados.'}
          </div>
        </div>
        <div className={styles.settingsCardBody}>
          <form onSubmit={handleSave} style={{ display: 'contents' }}>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="org-name">
                Nome da organização
              </label>
              <input
                id="org-name"
                className={styles.formInput}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Razão social ou nome fantasia"
                disabled={!isAdmin}
              />
            </div>
            <div className={styles.formRowHalf}>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="org-cnpj">
                  CNPJ
                </label>
                <input
                  id="org-cnpj"
                  className={styles.formInput}
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  disabled={!isAdmin}
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="org-phone">
                  Telefone
                </label>
                <input
                  id="org-phone"
                  className={styles.formInput}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 00000-0000"
                  disabled={!isAdmin}
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="org-website">
                Website
              </label>
              <input
                id="org-website"
                className={styles.formInput}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                disabled={!isAdmin}
              />
            </div>
            {isAdmin && (
              <div className={styles.saveRow}>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={updateSettings.isPending}
                >
                  {updateSettings.isPending ? 'Salvando…' : 'Salvar organização'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      <div className={styles.settingsCard}>
        <div className={styles.settingsCardHeader}>
          <div className={styles.settingsCardTitle}>Meta da organização</div>
          <div className={styles.settingsCardDesc}>
            {isAdmin
              ? 'Meta mensal de vendas em crédito — aparece no card "Meta da Representação" do início.'
              : 'Apenas o dono da representação pode editar a meta.'}
          </div>
        </div>
        <div className={styles.settingsCardBody}>
          <form onSubmit={handleSaveGoal} style={{ display: 'contents' }}>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="org-sales-goal">
                Meta mensal de vendas
              </label>
              <div className={styles.currencyInput}>
                <span className={styles.currencyPrefix}>R$</span>
                <input
                  id="org-sales-goal"
                  type="text"
                  inputMode="numeric"
                  className={styles.formInput}
                  value={orgGoal}
                  onChange={(e) => setOrgGoal(formatGoalInput(e.target.value))}
                  placeholder="0"
                  disabled={!isAdmin}
                />
              </div>
              <span className={styles.formHint}>
                {teamGoalsSumCents > 0
                  ? `Soma das metas da equipe: R$ ${formatBRL(teamGoalsSumCents)}. `
                  : ''}
                Sem meta definida, o início usa a soma das metas da equipe.
              </span>
            </div>
            {isAdmin && (
              <div className={styles.saveRow}>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={updateSettings.isPending}
                >
                  {updateSettings.isPending ? 'Salvando…' : 'Salvar meta'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      <div className={styles.settingsCard}>
        <div className={styles.settingsCardHeader}>
          <div className={styles.settingsCardTitle}>Tipos de crédito</div>
          <div className={styles.settingsCardDesc}>
            {isAdmin
              ? 'Os segmentos que esta representação trabalha — aparecem como opções ao criar um lead.'
              : 'Apenas o dono da representação pode editar estes dados.'}
          </div>
        </div>
        <div className={styles.settingsCardBody}>
          {isAdmin && (
            <form onSubmit={handleAddSegment} className={styles.segmentInputRow}>
              <input
                className={styles.formInput}
                value={newSegment}
                onChange={(e) => setNewSegment(e.target.value)}
                placeholder="Ex: Imobiliário, Auto, Pesado…"
              />
              <button
                type="submit"
                className={styles.secondaryBtn}
                disabled={!newSegment.trim() || updateSettings.isPending}
              >
                <PlusIcon /> Adicionar
              </button>
            </form>
          )}
          {organization.leadSegments.length === 0 ? (
            <p className={styles.segmentEmpty}>Nenhum tipo de crédito cadastrado ainda.</p>
          ) : (
            <div className={styles.segmentTagList}>
              {organization.leadSegments.map((segment) => (
                <span key={segment} className={styles.segmentTag}>
                  {segment}
                  {isAdmin && (
                    <button
                      type="button"
                      className={styles.segmentTagRemove}
                      onClick={() => handleRemoveSegment(segment)}
                      disabled={updateSettings.isPending}
                      aria-label={`Remover ${segment}`}
                    >
                      <XIcon />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.settingsCard}>
        <div className={styles.settingsCardHeader}>
          <div className={styles.settingsCardTitle}>Origens de lead</div>
          <div className={styles.settingsCardDesc}>
            {isAdmin
              ? 'De onde vêm os leads desta representação — aparecem como opções ao criar um lead.'
              : 'Apenas o dono da representação pode editar estes dados.'}
          </div>
        </div>
        <div className={styles.settingsCardBody}>
          {isAdmin && (
            <form onSubmit={handleAddSource} className={styles.segmentInputRow}>
              <input
                className={styles.formInput}
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="Ex: Facebook, Instagram, Indicação…"
              />
              <button
                type="submit"
                className={styles.secondaryBtn}
                disabled={!newSource.trim() || updateSettings.isPending}
              >
                <PlusIcon /> Adicionar
              </button>
            </form>
          )}
          {organization.leadSources.length === 0 ? (
            <p className={styles.segmentEmpty}>Nenhuma origem cadastrada ainda.</p>
          ) : (
            <div className={styles.segmentTagList}>
              {organization.leadSources.map((source) => (
                <span key={source} className={styles.segmentTag}>
                  {source}
                  {isAdmin && (
                    <button
                      type="button"
                      className={styles.segmentTagRemove}
                      onClick={() => handleRemoveSource(source)}
                      disabled={updateSettings.isPending}
                      aria-label={`Remover ${source}`}
                    >
                      <XIcon />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.settingsCard}>
        <div className={styles.settingsCardHeader}>
          <div className={styles.settingsCardTitle}>Tags</div>
          <div className={styles.settingsCardDesc}>
            {isAdmin
              ? 'Classificam leads (ex: Quente, Frio) — usadas no filtro do Kanban e na ficha do lead.'
              : 'Apenas o dono da representação pode editar estes dados.'}
          </div>
        </div>
        <div className={styles.settingsCardBody}>
          {isAdmin && (
            <form onSubmit={handleAddTag} className={styles.segmentInputRow}>
              <input
                className={styles.formInput}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Ex: Quente, Frio…"
              />
              <button
                type="submit"
                className={styles.secondaryBtn}
                disabled={!newTag.trim() || updateSettings.isPending}
              >
                <PlusIcon /> Adicionar
              </button>
            </form>
          )}
          {organization.leadTags.length === 0 ? (
            <p className={styles.segmentEmpty}>Nenhuma tag cadastrada ainda.</p>
          ) : (
            <div className={styles.segmentTagList}>
              {organization.leadTags.map((tag) => (
                <span key={tag} className={styles.segmentTag}>
                  {tag}
                  {isAdmin && (
                    <button
                      type="button"
                      className={styles.segmentTagRemove}
                      onClick={() => handleRemoveTag(tag)}
                      disabled={updateSettings.isPending}
                      aria-label={`Remover ${tag}`}
                    >
                      <XIcon />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <FunnelsSection isAdmin={isAdmin} />

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}

// ── Atividade view ─────────────────────────────────────────────────────────────────

const ACTIVITY_FILTERS: { value: ActivityEntityType | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os eventos' },
  ...(Object.keys(ACTIVITY_CATEGORY) as ActivityEntityType[]).map((type) => ({
    value: type,
    label: ACTIVITY_CATEGORY[type].label,
  })),
]

function ActivityDotIcon({ color, bg }: { color: string; bg: string }) {
  return (
    <div className={styles.activityIconWrap} style={{ background: bg }}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
      </svg>
    </div>
  )
}

function AtividadeView() {
  const { organizationId } = useActiveOrganization()
  const [filter, setFilter] = useState<ActivityEntityType | 'all'>('all')
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useActivityQuery(organizationId, filter === 'all' ? undefined : filter)
  const { data: teamData } = useTeamMembersQuery(organizationId)

  const memberName = (userId: string | null): string => {
    if (!userId) return 'ninguém'
    const member = teamData?.members.find((m) => m.userId === userId)
    return member ? (member.name ?? member.email) : 'um membro'
  }

  const entries = data?.pages.flatMap((page) => page.items) ?? []
  const total = data?.pages[0]?.total ?? 0

  // Agrupa por dia ("Hoje", "Ontem", "23 de setembro"), mantendo a ordem.
  const groups: { day: string; items: ActivityEntry[] }[] = []
  for (const entry of entries) {
    const day = activityDayLabel(entry.createdAt)
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.items.push(entry)
    else groups.push({ day, items: [entry] })
  }

  return (
    <div className={styles.settingsContent}>
      <div className={styles.activityToolbar}>
        <select
          className={styles.activityFilterSelect}
          value={filter}
          onChange={(e) => setFilter(e.target.value as ActivityEntityType | 'all')}
          aria-label="Filtrar eventos"
        >
          {ACTIVITY_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {!isLoading && total > 0 && (
          <span className={styles.activityCount}>
            {total === 1 ? '1 evento' : `${total.toLocaleString('pt-BR')} eventos`}
          </span>
        )}
      </div>

      <div className={styles.settingsCard}>
        <div className={styles.activityList}>
          {isLoading &&
            [0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.activityItem}>
                <Skeleton variant="circle" width="30px" height="30px" />
                <div className={styles.activityContent}>
                  <Skeleton variant="text" width="70%" height="14px" />
                  <Skeleton variant="text" width="80px" height="12px" />
                </div>
              </div>
            ))}

          {groups.map((group) => (
            <div key={group.day}>
              <div className={styles.activityDay}>{group.day}</div>
              {group.items.map((entry) => {
                const category = ACTIVITY_CATEGORY[entry.entityType]
                return (
                  <div key={entry.id} className={styles.activityItem}>
                    <ActivityDotIcon color={category.color} bg={category.bg} />
                    <div className={styles.activityContent}>
                      <div className={styles.activityAction}>
                        <span className={styles.activityUser}>{activityActorName(entry)}</span>{' '}
                        {describeActivity(entry, memberName)}
                      </div>
                      <div
                        className={styles.activityMeta}
                        title={new Date(entry.createdAt).toLocaleString('pt-BR')}
                      >
                        {activityTimeLabel(entry.createdAt)} · {category.label}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {!isLoading && entries.length === 0 && (
            <div className={styles.activityEmpty}>
              {isError
                ? 'Não foi possível carregar a atividade.'
                : 'Nenhum evento registrado ainda. As próximas ações da equipe aparecem aqui.'}
            </div>
          )}
        </div>

        {hasNextPage && (
          <div className={styles.activityLoadMore}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── InviteModal ────────────────────────────────────────────────────────────────────

function InviteModal({
  organizationId,
  invitableRoles,
  onClose,
}: {
  organizationId: string
  invitableRoles: InvitableRole[]
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InvitableRole>(invitableRoles[0] ?? 'SELLER')
  const [formError, setFormError] = useState('')
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const inviteMember = useInviteTeamMember(organizationId)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')

    if (!name.trim() || !email.trim()) {
      setFormError('Preencha nome e e-mail.')
      return
    }

    try {
      const result = await inviteMember.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        role,
      })
      setCredentials({ email: email.trim(), password: result.member.temporaryPassword })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível criar o usuário.')
    }
  }

  if (credentials) {
    return (
      // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop
      <div className={styles.modalOverlay} onClick={onClose}>
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal stops propagation */}
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <div className={styles.modalTitle}>Usuário criado</div>
            <div className={styles.modalDesc}>
              Compartilhe estas credenciais com a pessoa — elas só aparecem uma vez.
            </div>
          </div>
          <div className={styles.modalBody}>
            <div className={styles.credentialsBox}>
              <div className={styles.credentialsRow}>
                <span>{credentials.email}</span>
              </div>
              <div className={styles.credentialsRow}>
                <span>{credentials.password}</span>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => navigator.clipboard.writeText(credentials.password)}
                >
                  Copiar senha
                </button>
              </div>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.primaryBtn} onClick={onClose}>
              Concluir
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop
    <div className={styles.modalOverlay} onClick={onClose}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal stops propagation */}
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Adicionar usuário</div>
          <div className={styles.modalDesc}>
            Uma conta é criada na hora, com uma senha temporária pra você compartilhar.
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="invite-name">
                Nome
              </label>
              <input
                id="invite-name"
                type="text"
                className={styles.formInput}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="invite-email">
                E-mail
              </label>
              <input
                id="invite-email"
                type="email"
                className={styles.formInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com"
              />
            </div>
            <div className={styles.formRow}>
              <span className={styles.formLabel}>Função</span>
              <div className={styles.roleSelect}>
                {invitableRoles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`${styles.roleOption} ${role === r ? styles.roleOptionActive : ''}`}
                    onClick={() => setRole(r)}
                  >
                    <span className={styles.roleOptionLabel}>{ROLE_LABEL[r]}</span>
                    <span className={styles.roleOptionDesc}>{ROLE_DESCRIPTION[r]}</span>
                  </button>
                ))}
              </div>
            </div>
            {formError && (
              <span role="alert" className={styles.formError}>
                {formError}
              </span>
            )}
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.secondaryBtn} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={inviteMember.isPending}>
              {inviteMember.isPending ? 'Criando…' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RemoveMemberModal({
  member,
  isPending,
  onConfirm,
  onClose,
}: {
  member: TeamMember
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop
    <div className={styles.modalOverlay} onClick={onClose}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal stops propagation */}
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Remover usuário</div>
          <div className={styles.modalDesc}>
            Tem certeza que deseja remover <strong>{member.name ?? member.email}</strong> da equipe?
            Essa ação não pode ser desfeita.
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.dangerOutlineBtn}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Removendo…' : 'Remover'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MemberDetailModal ──────────────────────────────────────────────────────────

function MemberDetailModal({
  organizationId,
  member,
  canEditGoal,
  onSaved,
  onClose,
}: {
  organizationId: string
  member: TeamMember
  canEditGoal: boolean
  onSaved: (msg: string) => void
  onClose: () => void
}) {
  const [goal, setGoal] = useState(
    member.salesGoalCents !== null ? formatGoalInput(String(member.salesGoalCents / 100)) : '',
  )
  const [formError, setFormError] = useState('')
  const updateGoal = useUpdateTeamMemberSalesGoal(organizationId)
  const displayName = member.name ?? member.email

  async function save(salesGoalCents: number | null) {
    setFormError('')
    try {
      await updateGoal.mutateAsync({ userId: member.userId, salesGoalCents })
      onSaved(
        salesGoalCents === null
          ? `Meta de ${displayName} removida.`
          : `Meta de ${displayName} atualizada.`,
      )
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível salvar a meta.')
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    save(goalInputToCents(goal))
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop
    <div className={styles.modalOverlay} onClick={onClose}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal stops propagation */}
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.memberDetailHeader}>
            <span className={`${styles.avatar} ${styles.avatarLg}`}>
              {initialsForMember(member)}
            </span>
            <div className={styles.memberDetailInfo}>
              <div className={styles.modalTitle}>{member.name ?? '—'}</div>
              <div className={styles.modalDesc}>{member.email}</div>
            </div>
          </div>
          <div className={styles.memberDetailBadges}>
            <span className={`${styles.roleBadge} ${roleBadgeClass(member.role)}`}>
              {ROLE_LABEL[member.role]}
            </span>
            <span className={styles.statusCell}>
              <span className={`${styles.statusDot} ${statusDotClass(member.status)}`} />
              <span className={`${styles.statusLabel} ${statusLabelClass(member.status)}`}>
                {statusLabel(member.status)}
              </span>
            </span>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="member-sales-goal">
                Meta de vendas
              </label>
              <div className={styles.currencyInput}>
                <span className={styles.currencyPrefix}>R$</span>
                <input
                  id="member-sales-goal"
                  type="text"
                  inputMode="numeric"
                  className={styles.formInput}
                  value={goal}
                  onChange={(e) => setGoal(formatGoalInput(e.target.value))}
                  placeholder="0"
                  disabled={!canEditGoal}
                />
              </div>
              <span className={styles.formHint}>
                {canEditGoal
                  ? 'Valor em crédito que este membro deve vender na organização. Deixe em branco para ficar sem meta.'
                  : 'Só quem está acima deste membro na hierarquia pode alterar a meta.'}
              </span>
            </div>
            {formError && (
              <span role="alert" className={styles.formError}>
                {formError}
              </span>
            )}
          </div>
          <div className={styles.modalFooter}>
            {canEditGoal && member.salesGoalCents !== null && (
              <button
                type="button"
                className={`${styles.dangerOutlineBtn} ${styles.modalFooterLeft}`}
                onClick={() => save(null)}
                disabled={updateGoal.isPending}
              >
                Remover meta
              </button>
            )}
            <button type="button" className={styles.secondaryBtn} onClick={onClose}>
              {canEditGoal ? 'Cancelar' : 'Fechar'}
            </button>
            {canEditGoal && (
              <button type="submit" className={styles.primaryBtn} disabled={updateGoal.isPending}>
                {updateGoal.isPending ? 'Salvando…' : 'Salvar meta'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page header ──────────────────────────────────────────────────────────────────

const VIEW_LABELS: Record<View, string> = {
  hub: 'Configurações',
  equipe: 'Equipe',
  plano: 'Plano e Cobrança',
  preferencias: 'Preferências',
  notificacoes: 'Notificações',
  seguranca: 'Segurança',
  organizacao: 'Organização',
  atividade: 'Atividade',
  integracoes: 'Integrações',
}

// ── Component ────────────────────────────────────────────────────────────────────

export function ConfigPage() {
  const [requestedView, setView] = useState<View>('hub')
  const { membership } = useActiveOrganization()
  // Vendedor só vê "Minha Conta". Enquanto a organização carrega, também só
  // "Minha Conta" — melhor as seções da organização aparecerem um instante
  // depois pra quem pode do que piscarem pra quem não pode. As rotas da API
  // continuam exigindo as permissões de cada tela.
  const canSeeOrganization = membership ? membership.role !== 'SELLER' : false
  const view = canSeeOrganization || ACCOUNT_VIEWS.has(requestedView) ? requestedView : 'hub'

  const isHub = view === 'hub'

  return (
    <AppLayout>
      <div className={styles.page}>
        {/* Page header */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderLeft}>
            {!isHub && (
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setView('hub')}
                aria-label="Voltar"
              >
                <ChevronLeftIcon />
              </button>
            )}
            <div className={styles.breadcrumb}>
              <button
                type="button"
                className={isHub ? styles.breadcrumbCurrent : styles.breadcrumbLink}
                onClick={() => setView('hub')}
              >
                Configurações
              </button>
              {!isHub && (
                <>
                  <span className={styles.breadcrumbSep}>
                    <ChevronRightIcon />
                  </span>
                  <span className={styles.breadcrumbCurrent}>{VIEW_LABELS[view]}</span>
                </>
              )}
            </div>
          </div>
          {canSeeOrganization && (
            <span className={styles.adminBadge}>
              <ShieldIcon />
              Acesso de Administrador
            </span>
          )}
        </div>

        {/* View content */}
        {view === 'hub' && <HubView onNavigate={setView} showOrganization={canSeeOrganization} />}
        {view === 'equipe' && <EquipeView />}
        {view === 'plano' && <PlanoView />}
        {view === 'preferencias' && <PreferenciasView />}
        {view === 'notificacoes' && <NotificacoesView />}
        {view === 'seguranca' && <SegurancaView />}
        {view === 'organizacao' && <OrganizacaoView />}
        {view === 'atividade' && <AtividadeView />}
        {view === 'integracoes' && <IntegracoesSection />}
      </div>
    </AppLayout>
  )
}
