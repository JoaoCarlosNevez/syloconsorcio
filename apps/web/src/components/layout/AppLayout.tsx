// AppLayout — layout autenticado com sidebar branca.
// Sidebar: logo, seletor de empresa, nav, Sara IA, status, sair, perfil.

import { Dropdown, OrganizationAvatar } from '@sylocrm/ui'
import type { DropdownEntry, Tier } from '@sylocrm/ui'
import { type ReactNode, useLayoutEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { USER_TIER } from '../../data/kanban-mock'
import { useAuth } from '../../hooks/useAuth'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { applyBrandColor } from '../../lib/brand-theme'
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
function SairIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// ── Dados fixos ────────────────────────────────────────────────────────────────

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

// Paleta de cores por tier injetada como CSS custom properties no sidebar.
// O menu (--nav-*) usa a cor secundária White Label quando a organização
// ativa tem uma; senão, a do tier.
const TIER_PALETTE: Record<Tier, { accent: string; subtle: string; muted: string }> = {
  turmalina: { accent: '#00a6cc', subtle: 'rgba(0,166,204,0.10)', muted: 'rgba(0,166,204,0.06)' },
  rubi: { accent: '#e03135', subtle: 'rgba(224,49,53,0.10)', muted: 'rgba(224,49,53,0.06)' },
  platina: { accent: '#005ecc', subtle: 'rgba(0,94,204,0.10)', muted: 'rgba(0,94,204,0.06)' },
  diamante: { accent: '#7c3aed', subtle: 'rgba(124,58,237,0.10)', muted: 'rgba(124,58,237,0.06)' },
}

// Itens de navegação principal. `hiddenForRoles` restringe o item a quem não
// tem esse Role na organização ativa — Vendedor só opera o funil (Início,
// Kanban, Tarefas) e Ajuda; Fila/Configurações ficam de fora. `requiresPlatformAdmin`
// restringe o item a quem tem `isPlatformAdmin` (super admin da plataforma) —
// Administração é uma tela de operação da Sylo, não do ADMIN/MANAGER da organização.
const NAV_ITEMS = [
  { label: 'Início', path: '/app/home', icon: InicioIcon },
  { label: 'Kanban', path: '/app/kanban', icon: KanbanIcon },
  { label: 'Tarefas', path: '/app/tarefas', icon: TarefasIcon },
  { label: 'Fila', path: '/app/fila', icon: FilaIcon, hiddenForRoles: ['SELLER'] },
  { label: 'Configurações', path: '/app/config', icon: ConfigIcon, hiddenForRoles: ['SELLER'] },
  { label: 'Administração', path: '/app/admin', icon: AdminIcon, requiresPlatformAdmin: true },
  { label: 'Ajuda', path: '/app/ajuda', icon: AjudaIcon },
] as const

// ── AppLayout ─────────────────────────────────────────────────────────────────

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { data: currentUser } = useCurrentUser()
  const { membership, memberships, setActiveOrganizationId } = useActiveOrganization()
  const brandColor = membership?.organizationSecondaryColor ?? null
  const whiteLabelLogoUrl = membership?.organizationIconUrl ?? null

  // Cor White Label da organização ativa. Layout effect (e não useEffect) pra
  // que a troca de página — que desmonta e remonta o AppLayout — não pisque
  // o âmbar padrão entre uma e outra.
  useLayoutEffect(() => {
    applyBrandColor(brandColor)
    return () => applyBrandColor(null)
  }, [brandColor])

  const displayName =
    currentUser?.name ??
    (user?.user_metadata?.full_name as string | undefined) ??
    deriveDisplayName(user?.email)
  const palette = TIER_PALETTE[USER_TIER]

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const organizationSwitcherItems: DropdownEntry[] = memberships
    .filter((m) => m.organizationId !== membership?.organizationId)
    .map((m) => ({
      key: m.organizationId,
      label: m.organizationName,
      icon: (
        <OrganizationAvatar
          id={m.organizationId}
          name={m.organizationName}
          iconUrl={m.organizationIconUrl}
          size={20}
          className={styles.companyMenuIcon}
        />
      ),
      onSelect: () => setActiveOrganizationId(m.organizationId),
    }))

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
            ...(brandColor
              ? {
                  '--nav-accent': 'var(--color-accent)',
                  '--nav-text': 'var(--color-accent-text)',
                  '--nav-subtle': 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                  '--nav-muted': 'color-mix(in srgb, var(--color-accent) 6%, transparent)',
                }
              : {
                  '--nav-accent': palette.accent,
                  '--nav-text': palette.accent,
                  '--nav-subtle': palette.subtle,
                  '--nav-muted': palette.muted,
                }),
          } as React.CSSProperties
        }
      >
        {/* Logo */}
        <div
          className={whiteLabelLogoUrl ? `${styles.logo} ${styles.logoWhiteLabel}` : styles.logo}
        >
          {whiteLabelLogoUrl ? (
            <img
              src={whiteLabelLogoUrl}
              alt={membership?.organizationName ?? ''}
              className={styles.logoImgWhiteLabel}
            />
          ) : (
            <img src="/sylo-logo.png" alt="Sylo CRM" className={styles.logoImg} />
          )}
        </div>

        {/* Seletor de empresa — troca entre as organizações do usuário */}
        <div className={styles.companySwitcherSlot}>
          <Dropdown
            items={organizationSwitcherItems}
            trigger={
              <button type="button" className={styles.companySelector} aria-label="Trocar empresa">
                <div className={styles.companySelectorLeft}>
                  <div className={styles.companyIconWrap}>
                    {membership && (
                      <OrganizationAvatar
                        id={membership.organizationId}
                        name={membership.organizationName}
                        iconUrl={membership.organizationIconUrl}
                        size={26}
                      />
                    )}
                  </div>
                  <span className={styles.companyName}>
                    {membership?.organizationName ?? 'Carregando…'}
                  </span>
                </div>
                <span className={styles.companyCaret}>
                  <ChevronUpDownIcon />
                </span>
              </button>
            }
          />
        </div>

        {/* Navegação */}
        <nav className={styles.nav} aria-label="Navegação principal">
          {NAV_ITEMS.filter(
            (item) =>
              (!('hiddenForRoles' in item) ||
                !membership ||
                !(item.hiddenForRoles as readonly string[]).includes(membership.role)) &&
              (!('requiresPlatformAdmin' in item) || currentUser?.isPlatformAdmin === true),
          ).map(({ label, path, icon: Icon }) => (
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

          {/* Sair */}
          <button type="button" className={styles.logoutButton} onClick={handleSignOut}>
            <SairIcon />
            <span>Sair</span>
          </button>

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
              <img
                src={currentUser?.avatarUrl ?? '/default-avatar.svg'}
                alt={displayName}
                className={styles.userCardAvatar}
              />
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
