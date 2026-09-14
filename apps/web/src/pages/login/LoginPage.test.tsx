// Tests: LoginPage
//
// Verifica os contratos de UX do formulário de login:
//   - Validação de campos (email vazio, email inválido, senha curta)
//   - Estado de loading enquanto signIn está pendente
//   - Banner de erro quando useAuth reporta signInError
//   - Navegação para /app/home quando login é bem-sucedido
//
// useAuth é mockado via vi.mock com factory controlável por teste.
// Renderizado dentro de MemoryRouter — sem BrowserRouter real.

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockSignIn = vi.fn()

// Controllable factory — reset per test via mockUseAuthReturn
let mockUseAuthReturn = {
  signIn: mockSignIn,
  isSigningIn: false,
  signInError: null as { message: string } | null,
}

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuthReturn,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

// ── Setup ─────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockUseAuthReturn = { signIn: mockSignIn, isSigningIn: false, signInError: null }
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LoginPage — field validation', () => {
  it('shows error when email is empty and form is submitted', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.click(screen.getByRole('button', { name: /acessar plataforma/i }))

    // The Input component renders its own role="alert" for field errors,
    // AND the errorBanner also renders role="alert" — so there can be multiple.
    const alerts = await screen.findAllByRole('alert')
    expect(alerts.length).toBeGreaterThan(0)
    const allText = alerts.map((a) => a.textContent).join(' ')
    expect(allText).toMatch(/e-mail/i)
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('shows error when email format is invalid', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/e-mail corporativo/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /acessar plataforma/i }))

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.length).toBeGreaterThan(0)
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('shows error when password is empty', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/e-mail corporativo/i), 'user@empresa.com')
    await user.click(screen.getByRole('button', { name: /acessar plataforma/i }))

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.length).toBeGreaterThan(0)
    const allText = alerts.map((a) => a.textContent).join(' ')
    expect(allText).toMatch(/senha/i)
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('shows error when password is shorter than 6 characters', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/e-mail corporativo/i), 'user@empresa.com')
    await user.type(screen.getByLabelText(/^senha$/i), '123')
    await user.click(screen.getByRole('button', { name: /acessar plataforma/i }))

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.length).toBeGreaterThan(0)
    expect(mockSignIn).not.toHaveBeenCalled()
  })
})

describe('LoginPage — signIn interaction', () => {
  it('calls signIn with trimmed email and password when form is valid', async () => {
    mockSignIn.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/e-mail corporativo/i), '  user@empresa.com  ')
    await user.type(screen.getByLabelText(/^senha$/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /acessar plataforma/i }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'user@empresa.com',
        password: 'secret123',
      })
    })
  })

  it('navigates to /app/home after successful login', async () => {
    mockSignIn.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/e-mail corporativo/i), 'user@empresa.com')
    await user.type(screen.getByLabelText(/^senha$/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /acessar plataforma/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app/home', { replace: true })
    })
  })

  it('displays signInError banner when useAuth reports an error', () => {
    // Simulate post-mutation error state: useAuth returns signInError
    mockUseAuthReturn = {
      signIn: mockSignIn,
      isSigningIn: false,
      signInError: { message: 'Credenciais inválidas.' },
    }
    renderLoginPage()

    // Error from signInError is shown via displayError in the errorBanner
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Credenciais inválidas.')
  })

  it('does not show error banner when there is no error', () => {
    renderLoginPage()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('LoginPage — loading state', () => {
  it('disables the submit button while isSigningIn is true', () => {
    mockUseAuthReturn = { signIn: mockSignIn, isSigningIn: true, signInError: null }
    renderLoginPage()

    const submitButton = screen.getByRole('button', { name: /acessar plataforma/i })
    // Button receives disabled prop when isSigningIn is true
    expect(submitButton.hasAttribute('disabled')).toBe(true)
  })
})

describe('LoginPage — static content', () => {
  it('renders the form heading', () => {
    renderLoginPage()
    expect(screen.getByRole('heading', { name: /entrar/i })).toBeDefined()
  })

  it('renders email and password inputs', () => {
    renderLoginPage()
    expect(screen.getByLabelText(/e-mail corporativo/i)).toBeDefined()
    expect(screen.getByLabelText(/^senha$/i)).toBeDefined()
  })

  it('renders the "Lembrar de mim" checkbox', () => {
    renderLoginPage()
    expect(screen.getByLabelText(/lembrar de mim/i)).toBeDefined()
  })

  it('renders the Google Workspace button', () => {
    renderLoginPage()
    expect(screen.getByRole('button', { name: /google workspace/i })).toBeDefined()
  })
})
