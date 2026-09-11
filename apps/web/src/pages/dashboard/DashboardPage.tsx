// DashboardPage — área autenticada mínima.
//
// Criada na Etapa 07 exclusivamente para provar o fluxo de autenticação:
//   Login → sessão → ProtectedRoute → DashboardPage
//
// Não é a tela de Dashboard real do produto (será implementada em etapa futura).
// Exibe informações básicas do usuário autenticado e um botão de logout.

import { Button } from '@sylocrm/ui'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function DashboardPage() {
  const { user, signOut, isSigningOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-family-base)',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-card)',
          padding: '2rem',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            backgroundColor: 'var(--color-accent-subtle)',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: '1.5rem',
          }}
        >
          ⚡
        </div>

        <h1
          style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: '0.5rem',
          }}
        >
          Sylo CRM
        </h1>

        <p
          style={{
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-text-muted)',
            marginBottom: '0.25rem',
          }}
        >
          Autenticação funcionando
        </p>

        {user?.email && (
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              fontWeight: 'var(--font-weight-medium)',
              marginBottom: '2rem',
            }}
          >
            {user.email}
          </p>
        )}

        <Button variant="secondary" onClick={handleLogout} loading={isSigningOut} fullWidth>
          Sair
        </Button>
      </div>
    </main>
  )
}
