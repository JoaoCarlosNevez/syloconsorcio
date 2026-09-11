// Smoke test — verifica que a aplicação renderiza sem crash.
// App agora renderiza BrowserRouter + AppRouter, que por sua vez renderiza
// LoginPage (redirect de / → /app/dashboard → /login).
//
// useAuth é mockado para evitar dependência do Supabase em testes unitários.

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
})

vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    session: null,
    isLoading: false,
    isSignedIn: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signInError: null,
    isSigningIn: false,
  }),
}))

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    // App redirects unauthenticated users to /login which renders the login form
    expect(screen.getByRole('heading', { name: /entrar/i })).toBeDefined()
  })

  it('renders the login form by default (unauthenticated)', () => {
    render(<App />)
    expect(screen.getByLabelText(/e-mail corporativo/i)).toBeDefined()
  })
})
