// MobileLayout — casca do app do celular (/m): pede login (MobileLoginPage,
// no lugar da tela — a URL não muda, então o link do push continua valendo),
// troca pra organização que veio no link do push (?org=), registra o service
// worker e mostra a barra de abas.
//
// Fica fora do ProtectedRoute do /app: o celular não monta o AppLayout, o
// prompt de oferta nem o som do sininho do desktop — aqui o aviso é o push.

import { type ReactNode, useEffect } from 'react'
import { NavLink, Outlet, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMobileProfile } from '../../hooks/useMobileProfile'
import { useNotificationsQuery } from '../../hooks/useNotifications'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { type MobileProfile, type MobileTabKey, mobileTabs } from '../../lib/mobile-profile'
import { registerServiceWorker } from '../../lib/web-push'
import styles from './Mobile.module.css'
import { MobileLoginPage } from './MobileLoginPage'
import {
  BellIcon,
  ChartIcon,
  CheckSquareIcon,
  ColumnsIcon,
  HomeIcon,
  NetworkIcon,
  UsersIcon,
} from './icons'

function tabIcon(key: MobileTabKey, profile: MobileProfile): ReactNode {
  if (key === 'leads') return profile === 'adm' ? <ColumnsIcon /> : <UsersIcon />
  if (key === 'tarefas') return <CheckSquareIcon />
  if (key === 'avisos') return <BellIcon />
  if (profile === 'master') return <NetworkIcon />
  if (profile === 'gestao') return <ChartIcon />
  return <HomeIcon />
}

function TabBar() {
  const { organizationId } = useActiveOrganization()
  const { profile } = useMobileProfile()
  const { data } = useNotificationsQuery(organizationId)
  const unread = data?.unreadCount ?? 0
  const tabs = mobileTabs(profile)
  return (
    <nav
      className={styles.tabbar}
      aria-label="Navegação"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={tab.to}
          end={tab.key === 'inicio'}
          className={({ isActive }) =>
            isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab
          }
        >
          {tabIcon(tab.key, profile)}
          {tab.label}
          {tab.key === 'avisos' && unread > 0 && (
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

  useEffect(() => {
    registerServiceWorker().catch((error: unknown) => {
      console.error('[pwa] service worker não registrou', error)
    })
  }, [])

  if (isLoading) return <div className={styles.shell} />
  if (!isSignedIn) {
    return (
      <div className={styles.shell}>
        <MobileLoginPage />
      </div>
    )
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
