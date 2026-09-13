// AppLayout — layout autenticado com sidebar branca.
// Sidebar: logo, seletor de empresa, nav, Sara IA, status, tema, perfil.

import type { Tier } from '@sylocrm/ui'
import { type ReactNode, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { USER_TIER } from '../../data/kanban-mock'
import { useAuth } from '../../hooks/useAuth'
import styles from './AppLayout.module.css'

function deriveDisplayName(email: string | undefined): string {
  if (!email) return 'Usuário'
  const prefix = email.split('@')[0] ?? ''
  return prefix.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Ícones ────────────────────────────────────────────────────────────────────

function InicioIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function KanbanIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}
function TarefasIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  )
}
function FilaIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}
function ConfigIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
function AdminIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
function AjudaIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
      <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
      <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
      <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
    </svg>
  )
}
function ChevronUpDownIcon() {
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
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  )
}
function ChevronDownIcon() {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
function SunIcon() {
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
  )
}
function MoonIcon() {
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

// ── Dados fixos (mock até multi-tenant) ───────────────────────────────────────

const WORKSPACES = [
  { id: '1', name: 'Porthis Consórcio', icon: '/porthis-icon.png', active: true },
  { id: '2', name: 'Sylo Vendas SP', icon: '/porthis-icon.png', active: false },
  { id: '3', name: 'Matriz Norte', icon: '/porthis-icon.png', active: false },
]

const TIER_BORDER_COLOR: Record<Tier, string> = {
  turmalina: '#00a6cc',
  rubi: '#ff6d70',
  platina: '#005ecc',
  diamante: '#b69eff',
}

const TIER_LABELS: Record<Tier, string> = {
  turmalina: 'Turmalina',
  rubi: 'Rubi',
  platina: 'Platina',
  diamante: 'Diamante',
}

// Paleta de cores por tier injetada como CSS custom properties no sidebar
const TIER_PALETTE: Record<Tier, { accent: string; subtle: string; muted: string }> = {
  turmalina: { accent: '#00a6cc', subtle: 'rgba(0,166,204,0.10)', muted: 'rgba(0,166,204,0.06)' },
  rubi: { accent: '#e03135', subtle: 'rgba(224,49,53,0.10)', muted: 'rgba(224,49,53,0.06)' },
  platina: { accent: '#005ecc', subtle: 'rgba(0,94,204,0.10)', muted: 'rgba(0,94,204,0.06)' },
  diamante: { accent: '#7c3aed', subtle: 'rgba(124,58,237,0.10)', muted: 'rgba(124,58,237,0.06)' },
}

// Itens de navegação principal
const NAV_ITEMS = [
  { label: 'Início', path: '/app/home', icon: InicioIcon },
  { label: 'Kanban', path: '/app/kanban', icon: KanbanIcon },
  { label: 'Tarefas', path: '/app/tarefas', icon: TarefasIcon },
  { label: 'Fila', path: '/app/fila', icon: FilaIcon },
  { label: 'Configurações', path: '/app/config', icon: ConfigIcon },
  { label: 'Administração', path: '/app/admin', icon: AdminIcon },
  { label: 'Ajuda', path: '/app/ajuda', icon: AjudaIcon },
]

// ── AppLayout ─────────────────────────────────────────────────────────────────

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('sylo-theme') as 'light' | 'dark') ?? 'light'
  })
  const [companyOpen, setCompanyOpen] = useState(false)
  // biome-ignore lint/style/noNonNullAssertion: WORKSPACES is a non-empty const array
  const [activeWorkspace, setActiveWorkspace] = useState(WORKSPACES[0]!)

  // Aplica o tema no <html> e persiste
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('sylo-theme', theme)
  }, [theme])

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ?? deriveDisplayName(user?.email)
  const palette = TIER_PALETTE[USER_TIER]

  function navTo(path: string) {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      navigate(path)
    }
  }

  return (
    <div className={styles.layout}>
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={styles.sidebar}
        style={
          {
            '--tier-accent': palette.accent,
            '--tier-subtle': palette.subtle,
            '--tier-muted': palette.muted,
          } as React.CSSProperties
        }
      >
        {/* Logo */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: logo navigate home */}
        <div className={styles.logo} onClick={navTo('/app/home')} style={{ cursor: 'pointer' }}>
          <img src="/sylo-logo.png" alt="Sylo CRM" className={styles.logoImg} />
        </div>

        {/* Seletor de empresa */}
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <button
            type="button"
            className={styles.companySelector}
            style={{ marginBottom: 0 }}
            aria-label="Trocar empresa"
            onClick={() => setCompanyOpen((o) => !o)}
          >
            <div className={styles.companySelectorLeft}>
              <div className={styles.companyIconWrap}>
                <img src={activeWorkspace.icon} alt={activeWorkspace.name} />
              </div>
              <span className={styles.companyName}>{activeWorkspace.name}</span>
            </div>
            <span className={styles.companyCaret}>
              <ChevronUpDownIcon />
            </span>
          </button>

          {companyOpen && (
            // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 200 }}
              onClick={() => setCompanyOpen(false)}
            >
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: dropdown stops propagation */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 260,
                  width: 220,
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(11,28,48,0.12)',
                  padding: '8px 0',
                  zIndex: 201,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <p
                  style={{
                    margin: 0,
                    padding: '6px 14px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Workspaces
                </p>
                {WORKSPACES.map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '9px 14px',
                      background: ws.id === activeWorkspace.id ? '#f1f5f9' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                    onClick={() => {
                      setActiveWorkspace(ws)
                      setCompanyOpen(false)
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: '#0075ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={ws.icon}
                        alt=""
                        style={{ width: 18, height: 12, objectFit: 'contain' }}
                      />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>
                      {ws.name}
                    </span>
                    {ws.id === activeWorkspace.id && (
                      <svg
                        style={{ marginLeft: 'auto', flexShrink: 0 }}
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0075ff"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navegação */}
        <nav className={styles.nav} aria-label="Navegação principal">
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
            <a
              key={path}
              href={path}
              className={[styles.navItem, location.pathname === path ? styles.active : '']
                .filter(Boolean)
                .join(' ')}
              onClick={navTo(path)}
              aria-current={location.pathname === path ? 'page' : undefined}
            >
              <span style={{ width: 18, height: 18, flexShrink: 0 }}>
                <Icon />
              </span>
              {label}
            </a>
          ))}

          {/* Sara IA */}
          <a href="/app/sara" className={styles.saraNavItem} onClick={navTo('/app/sara')}>
            <img src="/sara-ia.png" alt="" aria-hidden="true" className={styles.saraAvatarSmall} />
            <span className={styles.saraNavLabel}>Sara IA</span>
            <span className={styles.betaBadge}>BETA</span>
          </a>
        </nav>

        {/* Rodapé da sidebar */}
        <div className={styles.sidebarBottom}>
          {/* Status vendedor */}
          <div className={styles.vendedorOnline}>
            <span className={styles.vendedorDot} aria-hidden="true" />
            <span>Vendedor Online</span>
            <span className={styles.vendedorSla}>99.8% SLA</span>
          </div>

          {/* Tema */}
          <fieldset className={styles.themeToggle} aria-label="Tema">
            <button
              type="button"
              className={`${styles.themeBtn} ${theme === 'light' ? styles.active : ''}`}
              onClick={() => setTheme('light')}
            >
              <SunIcon /> Claro
            </button>
            <button
              type="button"
              className={`${styles.themeBtn} ${theme === 'dark' ? styles.active : ''}`}
              onClick={() => setTheme('dark')}
            >
              <MoonIcon /> Escuro
            </button>
          </fieldset>

          {/* Perfil */}
          <button
            type="button"
            className={styles.userCard}
            onClick={() => navigate('/app/perfil')}
            aria-label="Perfil do usuário"
          >
            <div
              className={styles.userCardAvatarWrap}
              style={{ borderColor: TIER_BORDER_COLOR[USER_TIER] }}
            >
              <img src="/sara-profile.png" alt={displayName} className={styles.userCardAvatar} />
            </div>
            <div className={styles.userCardInfo}>
              <p className={styles.userCardName}>{displayName}</p>
              <p className={styles.userCardTier}>{TIER_LABELS[USER_TIER]}</p>
            </div>
            <ChevronDownIcon />
          </button>
        </div>
      </aside>

      {/* ── Conteúdo principal ───────────────────────────────────────────── */}
      <main className={styles.main}>{children}</main>
    </div>
  )
}
