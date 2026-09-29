// ProtectedRoute — proteção de rotas que exigem autenticação.
//
// Se o usuário não estiver autenticado, redireciona para /login.
// Se a sessão ainda está carregando, exibe um loading mínimo.
//
// ADR-04: sessão verificada via TanStack Query (server state).
// ADR-06: autenticação verificada antes de renderizar qualquer área protegida.
//
// Também monta o NotificationAlerts (som + notificação do navegador), que
// precisa viver acima das páginas pra não reiniciar a cada navegação.

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { NotificationAlerts } from '../notifications/NotificationAlerts'

export function ProtectedRoute() {
  const { isSignedIn, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'var(--font-family-base)',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        Carregando...
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }

  return (
    <>
      <NotificationAlerts />
      <Outlet />
    </>
  )
}
