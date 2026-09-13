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
          <button type="button" className={styles.addUserBtn}>
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

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 20,
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: '#565e74',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  }
  const selectStyle: React.CSSProperties = {
    border: '1px solid rgba(216,195,173,0.4)',
    borderRadius: 8,
    padding: '10px 12px',
    fontFamily: 'inherit',
    fontSize: 14,
    color: '#0b1c30',
    background: '#fff',
    outline: 'none',
    width: '100%',
    maxWidth: 320,
  }

  return (
    <div style={{ padding: '8px 0', maxWidth: 560 }}>
      <form onSubmit={handleSave}>
        {/* Aparência */}
        <div style={rowStyle}>
          <span style={labelStyle}>Aparência</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => applyTheme('light')}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: theme === 'light' ? '2px solid #0b1c30' : '1px solid rgba(216,195,173,0.4)',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: theme === 'light' ? '#0b1c30' : '#fff',
                color: theme === 'light' ? '#fff' : '#565e74',
              }}
            >
              ☀️ Claro
            </button>
            <button
              type="button"
              onClick={() => applyTheme('dark')}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: theme === 'dark' ? '2px solid #0b1c30' : '1px solid rgba(216,195,173,0.4)',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: theme === 'dark' ? '#0b1c30' : '#fff',
                color: theme === 'dark' ? '#fff' : '#565e74',
              }}
            >
              🌙 Escuro
            </button>
          </div>
        </div>

        {/* Idioma */}
        <div style={rowStyle}>
          <label style={labelStyle}>
            Idioma
            <select style={{ ...selectStyle, marginTop: 6 }}>
              <option>Português (Brasil)</option>
              <option>English (US)</option>
              <option>Español</option>
            </select>
          </label>
        </div>

        {/* Fuso horário */}
        <div style={rowStyle}>
          <label style={labelStyle}>
            Fuso Horário
            <select style={{ ...selectStyle, marginTop: 6 }}>
              <option>America/Sao_Paulo (UTC-3)</option>
              <option>America/Manaus (UTC-4)</option>
              <option>America/Fortaleza (UTC-3)</option>
              <option>America/Belem (UTC-3)</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          style={{
            padding: '10px 24px',
            background: '#0b1c30',
            border: 'none',
            borderRadius: 8,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Salvar preferências
        </button>
      </form>

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}

// ── Segurança view ─────────────────────────────────────────────────────────────────

function SegurancaView() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

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

  const inputStyle: React.CSSProperties = {
    border: '1px solid rgba(216,195,173,0.4)',
    borderRadius: 8,
    padding: '10px 12px',
    fontFamily: 'inherit',
    fontSize: 14,
    color: '#0b1c30',
    background: '#fff',
    outline: 'none',
    width: '100%',
    maxWidth: 320,
  }
  const labelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    color: '#565e74',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 16,
  }

  return (
    <div style={{ padding: '8px 0', maxWidth: 400 }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <label style={labelStyle}>
          Senha atual
          <input
            type="password"
            style={inputStyle}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••"
          />
        </label>
        <label style={labelStyle}>
          Nova senha
          <input
            type="password"
            style={inputStyle}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Mínimo 8 caracteres"
          />
        </label>
        <label style={labelStyle}>
          Confirmar nova senha
          <input
            type="password"
            style={inputStyle}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a nova senha"
          />
        </label>
        {error && <span style={{ fontSize: 13, color: '#ba1a1a', marginBottom: 12 }}>{error}</span>}
        <button
          type="submit"
          style={{
            padding: '10px 24px',
            background: '#0b1c30',
            border: 'none',
            borderRadius: 8,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            color: '#fff',
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          Alterar senha
        </button>
      </form>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}

// ── Coming soon sub-page ─────────────────────────────────────────────────────────

function ComingSoonSub({ label }: { label: string }) {
  return (
    <div className={styles.comingSoonSub}>
      <span className={styles.comingSoonSubLabel}>{label}</span>
      <span className={styles.comingSoonSubHint}>Esta seção está em desenvolvimento.</span>
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
        {view === 'seguranca' && <SegurancaView />}
        {(view === 'notificacoes' || view === 'organizacao' || view === 'atividade') && (
          <ComingSoonSub label={VIEW_LABELS[view]} />
        )}
      </div>
    </AppLayout>
  )
}
