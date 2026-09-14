// ConfigPage — Configurações com três sub-páginas: Hub, Equipe, Plano e Cobrança

import { type FormEvent, useEffect, useState } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import styles from './ConfigPage.module.css'

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

function FilterIcon() {
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
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
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

function DotsIcon() {
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
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
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

function EditIcon() {
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
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function KeyIcon() {
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
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  )
}

function BanIcon() {
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
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
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

type UserRole = 'Administrador' | 'Membro' | 'Visualizador'
type UserStatus = 'Ativo' | 'Convite pendente' | 'Inativo'

interface TeamUser {
  id: string
  name: string
  email: string
  initials: string
  initialsColor: string
  role: UserRole
  status: UserStatus
  lastActivity: string
}

// ── Mock data ────────────────────────────────────────────────────────────────────

const TEAM_USERS: TeamUser[] = [
  {
    id: '1',
    name: 'Carlos Mendes',
    email: 'carlos@sylo.com',
    initials: 'CM',
    initialsColor: '#3b82f6',
    role: 'Administrador',
    status: 'Ativo',
    lastActivity: 'Há 2 min',
  },
  {
    id: '2',
    name: 'Ana Souza',
    email: 'ana@sylo.com',
    initials: 'AS',
    initialsColor: '#8b5cf6',
    role: 'Membro',
    status: 'Ativo',
    lastActivity: 'Há 15 min',
  },
  {
    id: '3',
    name: 'Pedro Lima',
    email: 'pedro@sylo.com',
    initials: 'PL',
    initialsColor: '#059669',
    role: 'Membro',
    status: 'Ativo',
    lastActivity: 'Há 1 h',
  },
  {
    id: '4',
    name: 'Juliana Costa',
    email: 'juliana@sylo.com',
    initials: 'JC',
    initialsColor: '#f59e0b',
    role: 'Visualizador',
    status: 'Ativo',
    lastActivity: 'Há 3 h',
  },
  {
    id: '5',
    name: 'Rafael Alves',
    email: 'rafael@sylo.com',
    initials: 'RA',
    initialsColor: '#ef4444',
    role: 'Membro',
    status: 'Convite pendente',
    lastActivity: '—',
  },
  {
    id: '6',
    name: 'Mariana Rocha',
    email: 'mariana@sylo.com',
    initials: 'MR',
    initialsColor: '#ec4899',
    role: 'Membro',
    status: 'Convite pendente',
    lastActivity: '—',
  },
  {
    id: '7',
    name: 'Lucas Ferreira',
    email: 'lucas@sylo.com',
    initials: 'LF',
    initialsColor: '#64748b',
    role: 'Visualizador',
    status: 'Inativo',
    lastActivity: 'Há 14 dias',
  },
  {
    id: '8',
    name: 'Camila Nunes',
    email: 'camila@sylo.com',
    initials: 'CN',
    initialsColor: '#64748b',
    role: 'Membro',
    status: 'Inativo',
    lastActivity: 'Há 22 dias',
  },
]

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
]

function HubView({ onNavigate }: { onNavigate: (v: View) => void }) {
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

      {/* Organização */}
      <section className={styles.hubSection}>
        <div className={styles.hubSectionHeader}>
          <span className={styles.hubSectionLabel}>Organização</span>
        </div>
        <div className={styles.hubCard}>
          {ORG_ITEMS.map((item, i) => (
            <button
              key={item.view}
              type="button"
              className={`${styles.hubNavItem} ${i < ORG_ITEMS.length - 1 ? styles.hubNavItemBorder : ''}`}
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
          <button type="button" className={styles.hubNavItem} onClick={() => onNavigate('plano')}>
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
  const [search, setSearch] = useState('')
  const [contextMenu, setContextMenu] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [inviteOpen, setInviteOpen] = useState(false)

  const filtered = TEAM_USERS.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function roleClass(role: UserRole) {
    if (role === 'Administrador') return styles.roleAdmin
    return styles.roleMember
  }

  function statusDotClass(status: UserStatus) {
    if (status === 'Ativo') return styles.dotAtivo
    if (status === 'Convite pendente') return styles.dotPendente
    return styles.dotInativo
  }

  function statusLabelClass(status: UserStatus) {
    if (status === 'Ativo') return styles.statusAtivo
    if (status === 'Convite pendente') return styles.statusPendente
    return styles.statusInativo
  }

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
        <div className={styles.equipeToolbarRight}>
          <button type="button" className={styles.filterBtn}>
            <FilterIcon />
            Filtros
          </button>
          <button type="button" className={styles.addUserBtn} onClick={() => setInviteOpen(true)}>
            <PlusIcon />
            Adicionar usuário
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHead}>
              <th className={styles.thUser}>USUÁRIO</th>
              <th className={styles.th}>FUNÇÃO</th>
              <th className={styles.th}>STATUS</th>
              <th className={styles.th}>ÚLTIMA ATIVIDADE</th>
              <th className={`${styles.th} ${styles.thActions}`}>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((user) => (
              <tr key={user.id} className={styles.tableRow}>
                <td className={styles.tdUser}>
                  <span
                    className={styles.avatar}
                    style={{ background: `${user.initialsColor}22`, color: user.initialsColor }}
                  >
                    {user.initials}
                  </span>
                  <span className={styles.userInfo}>
                    <span className={styles.userName}>{user.name}</span>
                    <span className={styles.userEmail}>{user.email}</span>
                  </span>
                </td>
                <td className={styles.td}>
                  <span className={`${styles.roleBadge} ${roleClass(user.role)}`}>{user.role}</span>
                </td>
                <td className={styles.td}>
                  <span className={styles.statusCell}>
                    <span className={`${styles.statusDot} ${statusDotClass(user.status)}`} />
                    <span className={`${styles.statusLabel} ${statusLabelClass(user.status)}`}>
                      {user.status}
                    </span>
                  </span>
                </td>
                <td className={styles.td}>
                  <span className={styles.lastActivity}>{user.lastActivity}</span>
                </td>
                <td className={`${styles.td} ${styles.tdActions}`}>
                  <div className={styles.contextMenuWrap}>
                    <button
                      type="button"
                      className={styles.dotsBtn}
                      onClick={() => setContextMenu(contextMenu === user.id ? null : user.id)}
                      aria-label="Ações"
                    >
                      <DotsIcon />
                    </button>
                    {contextMenu === user.id && (
                      // biome-ignore lint/a11y/useKeyWithClickEvents: dismiss on backdrop
                      <div className={styles.contextBackdrop} onClick={() => setContextMenu(null)}>
                        {/* biome-ignore lint/a11y/useKeyWithClickEvents: menu stops propagation */}
                        <div className={styles.contextMenu} onClick={(e) => e.stopPropagation()}>
                          <button type="button" className={styles.contextItem}>
                            <EditIcon /> Editar permissões
                          </button>
                          <button type="button" className={styles.contextItem}>
                            <KeyIcon /> Redefinir senha
                          </button>
                          <button
                            type="button"
                            className={`${styles.contextItem} ${styles.contextItemDanger}`}
                          >
                            <BanIcon /> Desativar usuário
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}

      {/* Pagination */}
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
        stroke="#ffa705"
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

  const strength = passwordStrength(next)

  function handleSubmit(e: FormEvent) {
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
    if (next !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setCurrent('')
    setNext('')
    setConfirm('')
    setToast('Senha alterada com sucesso!')
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
                className={styles.formInput}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a nova senha"
                style={{ maxWidth: 340 }}
              />
            </div>
            {error && <span className={styles.formError}>{error}</span>}
            <div className={styles.saveRow}>
              <button type="submit" className={styles.primaryBtn}>
                Alterar senha
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

interface NotifSetting {
  id: string
  label: string
  desc: string
  email: boolean
  push: boolean
  inApp: boolean
}

const NOTIF_DEFAULTS: NotifSetting[] = [
  {
    id: 'new-lead',
    label: 'Novo lead atribuído',
    desc: 'Quando um lead é atribuído a você',
    email: true,
    push: true,
    inApp: true,
  },
  {
    id: 'task-due',
    label: 'Tarefa próxima do vencimento',
    desc: '24h antes do prazo',
    email: true,
    push: false,
    inApp: true,
  },
  {
    id: 'task-overdue',
    label: 'Tarefa vencida',
    desc: 'Quando uma tarefa passa do prazo',
    email: true,
    push: true,
    inApp: true,
  },
  {
    id: 'comment',
    label: 'Novo comentário',
    desc: 'Quando alguém comenta em suas tarefas',
    email: false,
    push: false,
    inApp: true,
  },
  {
    id: 'member-join',
    label: 'Novo membro na equipe',
    desc: 'Quando alguém aceita um convite',
    email: false,
    push: false,
    inApp: true,
  },
  {
    id: 'billing',
    label: 'Cobrança e pagamentos',
    desc: 'Faturas, falhas e renovações',
    email: true,
    push: false,
    inApp: true,
  },
]

function NotificacoesView() {
  const [notifs, setNotifs] = useState<NotifSetting[]>(NOTIF_DEFAULTS)
  const [toast, setToast] = useState('')

  function toggle(id: string, channel: 'email' | 'push' | 'inApp') {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, [channel]: !n[channel] } : n)))
  }

  return (
    <div className={styles.settingsContent}>
      <div className={styles.settingsCard}>
        <div className={styles.notifHeader}>
          <span className={styles.notifHeaderLabel}>Evento</span>
          <span className={styles.notifHeaderLabel}>E-mail</span>
          <span className={styles.notifHeaderLabel}>Push</span>
          <span className={styles.notifHeaderLabel}>In-app</span>
        </div>
        {notifs.map((n) => (
          <div key={n.id} className={styles.notifRow}>
            <div>
              <div className={styles.notifRowLabel}>{n.label}</div>
              <div className={styles.notifRowDesc}>{n.desc}</div>
            </div>
            {(['email', 'push', 'inApp'] as const).map((ch) => (
              <div key={ch} className={styles.notifCell}>
                <label className={styles.toggleSwitch}>
                  <input type="checkbox" checked={n[ch]} onChange={() => toggle(n.id, ch)} />
                  <span className={styles.toggleTrack} />
                  <span className={styles.toggleThumb} />
                </label>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className={styles.saveRow}>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => setToast('Preferências de notificação salvas!')}
        >
          Salvar notificações
        </button>
      </div>

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}

// ── Organização view ───────────────────────────────────────────────────────────────

function OrganizacaoView() {
  const [orgName, setOrgName] = useState('Sylo Consultoria')
  const [cnpj, setCnpj] = useState('12.345.678/0001-90')
  const [website, setWebsite] = useState('https://sylocrm.com')
  const [phone, setPhone] = useState('(11) 99999-0000')
  const [sector, setSector] = useState('financeiro')
  const [toast, setToast] = useState('')

  function handleSave(e: FormEvent) {
    e.preventDefault()
    setToast('Dados da organização salvos com sucesso!')
  }

  return (
    <div className={styles.settingsContent}>
      <div className={styles.settingsCard}>
        <div className={styles.settingsCardHeader}>
          <div className={styles.settingsCardTitle}>Identidade da organização</div>
          <div className={styles.settingsCardDesc}>Logo e nome público exibidos no sistema</div>
        </div>
        <div className={styles.settingsCardBody}>
          <div className={styles.logoUploadRow}>
            <div className={styles.logoPreview}>SC</div>
            <div className={styles.logoUploadActions}>
              <button type="button" className={styles.secondaryBtn}>
                Alterar logo
              </button>
              <span className={styles.formHint}>PNG ou SVG · Máx. 1MB · 256×256px</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.settingsCard}>
        <div className={styles.settingsCardHeader}>
          <div className={styles.settingsCardTitle}>Dados da empresa</div>
          <div className={styles.settingsCardDesc}>Informações cadastrais da organização</div>
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
                />
              </div>
            </div>
            <div className={styles.formRowHalf}>
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
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="org-sector">
                  Setor
                </label>
                <select
                  id="org-sector"
                  className={styles.formSelect}
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                >
                  <option value="financeiro">Financeiro / Bancário</option>
                  <option value="seguros">Seguros</option>
                  <option value="imobiliario">Imobiliário</option>
                  <option value="consorcio">Consórcio</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>
            <div className={styles.saveRow}>
              <button type="submit" className={styles.primaryBtn}>
                Salvar organização
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}

// ── Atividade view ─────────────────────────────────────────────────────────────────

interface ActivityEntry {
  id: string
  type: 'lead' | 'task' | 'user' | 'billing' | 'auth'
  action: string
  user: string
  time: string
  color: string
  bg: string
}

const ACTIVITY_LOG: ActivityEntry[] = [
  {
    id: '1',
    type: 'lead',
    action: 'criou o lead',
    user: 'Carlos Mendes',
    time: 'Há 5 min',
    color: '#1d4ed8',
    bg: '#eff6ff',
  },
  {
    id: '2',
    type: 'task',
    action: 'concluiu a tarefa "Follow-up Bradesco"',
    user: 'Ana Souza',
    time: 'Há 18 min',
    color: '#059669',
    bg: '#dcfce7',
  },
  {
    id: '3',
    type: 'user',
    action: 'convidou Rafael Alves para a equipe',
    user: 'Carlos Mendes',
    time: 'Há 1 h',
    color: '#8b5cf6',
    bg: '#f3e8ff',
  },
  {
    id: '4',
    type: 'lead',
    action: 'moveu lead para "Proposta Enviada"',
    user: 'Pedro Lima',
    time: 'Há 2 h',
    color: '#1d4ed8',
    bg: '#eff6ff',
  },
  {
    id: '5',
    type: 'auth',
    action: 'fez login',
    user: 'Juliana Costa',
    time: 'Há 3 h',
    color: '#64748b',
    bg: '#f1f5f9',
  },
  {
    id: '6',
    type: 'billing',
    action: 'fatura #2024-011 paga com sucesso',
    user: 'Sistema',
    time: '01/11/2024',
    color: '#059669',
    bg: '#dcfce7',
  },
  {
    id: '7',
    type: 'task',
    action: 'criou a tarefa "Apresentação Itaú"',
    user: 'Ana Souza',
    time: '31/10/2024',
    color: '#059669',
    bg: '#dcfce7',
  },
  {
    id: '8',
    type: 'user',
    action: 'alterou permissão de Juliana Costa para Visualizador',
    user: 'Carlos Mendes',
    time: '30/10/2024',
    color: '#8b5cf6',
    bg: '#f3e8ff',
  },
]

const TYPE_LABELS: Record<ActivityEntry['type'], string> = {
  lead: 'Lead',
  task: 'Tarefa',
  user: 'Usuário',
  billing: 'Cobrança',
  auth: 'Acesso',
}

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
  const [filter, setFilter] = useState<ActivityEntry['type'] | 'all'>('all')

  const filtered = filter === 'all' ? ACTIVITY_LOG : ACTIVITY_LOG.filter((a) => a.type === filter)

  return (
    <div className={styles.settingsContent}>
      <div className={styles.activityToolbar}>
        <select
          className={styles.activityFilterSelect}
          value={filter}
          onChange={(e) => setFilter(e.target.value as ActivityEntry['type'] | 'all')}
        >
          <option value="all">Todos os eventos</option>
          {(Object.keys(TYPE_LABELS) as ActivityEntry['type'][]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.settingsCard}>
        <div className={styles.activityList}>
          {filtered.map((entry) => (
            <div key={entry.id} className={styles.activityItem}>
              <ActivityDotIcon color={entry.color} bg={entry.bg} />
              <div className={styles.activityContent}>
                <div className={styles.activityAction}>
                  <span className={styles.activityUser}>{entry.user}</span> {entry.action}
                </div>
                <div className={styles.activityMeta}>{entry.time}</div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div
              style={{
                padding: '40px 22px',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: 'var(--cfg-text-sm)',
              }}
            >
              Nenhum evento encontrado.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── InviteModal ────────────────────────────────────────────────────────────────────

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('Membro')
  const [toast, setToast] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setToast(`Convite enviado para ${email}`)
    setTimeout(onClose, 1800)
  }

  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop */}
      <div className={styles.modalOverlay} onClick={onClose}>
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal stops propagation */}
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <div className={styles.modalTitle}>Convidar usuário</div>
            <div className={styles.modalDesc}>
              O convite será enviado por e-mail. O usuário terá 7 dias para aceitar.
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className={styles.modalBody}>
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
                  {(['Administrador', 'Membro', 'Visualizador'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`${styles.roleOption} ${role === r ? styles.roleOptionActive : ''}`}
                      onClick={() => setRole(r)}
                    >
                      <span className={styles.roleOptionLabel}>{r}</span>
                      <span className={styles.roleOptionDesc}>
                        {r === 'Administrador' && 'Acesso total'}
                        {r === 'Membro' && 'Criar e editar'}
                        {r === 'Visualizador' && 'Somente leitura'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.secondaryBtn} onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className={styles.primaryBtn}>
                Enviar convite
              </button>
            </div>
          </form>
        </div>
      </div>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </>
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
}

// ── Component ────────────────────────────────────────────────────────────────────

export function ConfigPage() {
  const [view, setView] = useState<View>('hub')

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
          <span className={styles.adminBadge}>
            <ShieldIcon />
            Acesso de Administrador
          </span>
        </div>

        {/* View content */}
        {view === 'hub' && <HubView onNavigate={setView} />}
        {view === 'equipe' && <EquipeView />}
        {view === 'plano' && <PlanoView />}
        {view === 'preferencias' && <PreferenciasView />}
        {view === 'notificacoes' && <NotificacoesView />}
        {view === 'seguranca' && <SegurancaView />}
        {view === 'organizacao' && <OrganizacaoView />}
        {view === 'atividade' && <AtividadeView />}
      </div>
    </AppLayout>
  )
}
