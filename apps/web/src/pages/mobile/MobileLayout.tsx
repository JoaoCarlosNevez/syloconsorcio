// MobileLayout — casca do app do celular (/m): exige login, troca pra
// organização que veio no link do push (?org=), registra o service worker e
// mostra a barra de abas.
//
// Fica fora do ProtectedRoute do /app: o celular não monta o AppLayout, o
// prompt de oferta nem o som do sininho do desktop — aqui o aviso é o push.

import { useEffect } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useNotificationsQuery } from '../../hooks/useNotifications'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { registerServiceWorker } from '../../lib/web-push'
import styles from './Mobile.module.css'
import { BellIcon, CheckSquareIcon, HomeIcon, UsersIcon } from './icons'

const TABS = [
  { to: '/m', label: 'Hoje', icon: <HomeIcon />, end: true },
  { to: '/m/leads', label: 'Leads', icon: <UsersIcon />, end: false },
  { to: '/m/tarefas', label: 'Tarefas', icon: <CheckSquareIcon />, end: false },
  { to: '/m/avisos', label: 'Avisos', icon: <BellIcon />, end: false },
] as const

function TabBar() {
  const { organizationId } = useActiveOrganization()
  const { data } = useNotificationsQuery(organizationId)
  const unread = data?.unreadCount ?? 0
  return (
    <nav className={styles.tabbar} aria-label="Navegação">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab
          }
        >
          {tab.icon}
          {tab.label}
          {tab.to === '/m/avisos' && unread > 0 && (
            <span className={styles.tabDot}>{unread > 99 ? '99+' : unread}</span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

/** ?org=<id> (link do push) vira a organização ativa e sai da URL. */
function useOrganizationFromLink() {
  const [params, setParams] = useSearchParams()
  const { memberships, setActiveOrganizationId } = useActiveOrganization()
  const org = params.get('org')
  useEffect(() => {
    if (!org || memberships.length === 0) return
    if (memberships.some((m) => m.organizationId === org)) setActiveOrganizationId(org)
    const next = new URLSearchParams(params)
    next.delete('org')
    setParams(next, { replace: true })
  }, [org, memberships, params, setActiveOrganizationId, setParams])
}

export function MobileLayout() {
  const { isSignedIn, isLoading } = useAuth()
  const location = useLocation()

  useEffect(() => {
    registerServiceWorker().catch((error: unknown) => {
      console.error('[pwa] service worker não registrou', error)
    })
  }, [])

  if (isLoading) return <div className={styles.shell} />
  if (!isSignedIn) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  return <SignedInShell />
}

function SignedInShell() {
  useOrganizationFromLink()
  return (
    <div className={styles.shell}>
      <Outlet />
      <TabBar />
    </div>
  )
}
