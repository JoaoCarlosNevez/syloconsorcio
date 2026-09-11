// ProtectedRoute — proteção de rotas que exigem autenticação.
//
// Se o usuário não estiver autenticado, redireciona para /login.
// Se a sessão ainda está carregando, exibe um loading mínimo.
//
// ADR-09: sessão verificada via TanStack Query (server state).
// ADR-12: autenticação verificada antes de renderizar qualquer área protegida.

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

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

  return <Outlet />
}
