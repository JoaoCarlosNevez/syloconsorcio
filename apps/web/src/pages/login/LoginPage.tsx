// LoginPage — tela de login fiel ao Figma (frame 208:1297).
//
// Design: split-screen 768px (Sara IA) + 512px (form).
// Valores confirmados via Figma MCP e docs/design-system.md.
//
// Estados implementados:
//   Default, Focus (via CSS), Loading, Error, Disabled, Success (redirect)
//
// Acessibilidade:
//   - Campos com labels explícitos (htmlFor)
//   - aria-invalid em campo inválido
//   - role="alert" no banner de erro
//   - aria-label nos ícones

import { Button, Checkbox, Input } from '@sylocrm/ui'
import { type FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './LoginPage.module.css'

// ── Icons ─────────────────────────────────────────────────────────────────────

function EmailIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function ShieldIcon() {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function ArrowRightIcon() {
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
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

// ── LoginPage ─────────────────────────────────────────────────────────────────

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn, isSigningIn, signInError, isSignedIn, isLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const displayError = validationError ?? signInError?.message ?? null

  // Já autenticado — redireciona direto para o dashboard
  if (!isLoading && isSignedIn) {
    return <Navigate to="/app/home" replace />
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setValidationError(null)

    // Frontend validation (UX layer — backend also validates)
    if (!email.trim()) {
      setValidationError('Informe o e-mail corporativo.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setValidationError('E-mail inválido.')
      return
    }

    if (!password) {
      setValidationError('Informe a senha.')
      return
    }

    if (password.length < 6) {
      setValidationError('Senha deve ter pelo menos 6 caracteres.')
      return
    }

    try {
      await signIn({ email: email.trim(), password })
      navigate('/app/home', { replace: true })
    } catch {
      // Erro exibido via signInError — sem ação adicional necessária
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Painel esquerdo (Sara IA) ─────────────────────────────────────── */}
      <div className={styles.leftPanel} aria-hidden="true">
        <img
          src="/sara-ia.png"
          alt="Sara, assistente de IA da Sylo"
          className={styles.saraImage}
        />

        <div className={styles.overlay} />

        {/* Floating badge "Sara IA" */}
        <div className={styles.saraBadge}>
          <span className={styles.saraDot} />
          <span className={styles.saraBadgeText}>Sara IA</span>
        </div>

        {/* Conteúdo textual */}
        <div className={styles.leftContent}>
          <h1 className={styles.headline}>Potencialize suas vendas com o Sylo CRM</h1>
          <p className={styles.subtitle}>
            Acompanhe seus leads, acelere fechamentos de consórcios e conte com um suporte da Sara
            em tempo real para superar todas as suas metas.
          </p>

          {/* Faixa de métricas */}
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <div className={styles.metricValue}>+38%</div>
              <div className={styles.metricLabel}>Taxa de Conversão</div>
            </div>
            <div className={styles.metricDivider} />
            <div className={styles.metric}>
              <div className={styles.metricValue}>2.4x</div>
              <div className={styles.metricLabel}>Velocidade no Pipeline</div>
            </div>
            <div className={styles.metricDivider} />
            <div className={styles.metric}>
              <div className={`${styles.metricValue} ${styles.amber}`}>24/7</div>
              <div className={styles.metricLabel}>Mentoria Comercial IA</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Painel direito (formulário) ───────────────────────────────────── */}
      <div className={styles.rightPanel}>
        <div className={styles.formContainer}>
          {/* Logo */}
          <div className={styles.logo} aria-label="Sylo CRM">
            <img src="/sylo-logo.png" alt="Sylo CRM" className={styles.logoImg} />
          </div>

          {/* Cabeçalho */}
          <h2 className={styles.formHeading}>Entrar</h2>
          <p className={styles.formSubtitle}>
            Bem-vindo ao Sylo CRM. Acesse sua conta para gerenciar seu pipeline e metas de vendas.
          </p>

          {/* Formulário */}
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <Input
              label="E-MAIL CORPORATIVO"
              type="email"
              placeholder="seu.email@empresa.com.br"
              leftIcon={<EmailIcon />}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setValidationError(null)
              }}
              autoComplete="email"
              inputMode="email"
              disabled={isSigningIn}
              errorMessage={
                (validationError?.includes('mail') ?? validationError?.includes('e-mail'))
                  ? validationError
                  : undefined
              }
            />

            <Input
              label="SENHA"
              passwordToggle
              placeholder="••••••••••••"
              leftIcon={<LockIcon />}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setValidationError(null)
              }}
              autoComplete="current-password"
              disabled={isSigningIn}
            />

            <div className={styles.optionsRow}>
              <Checkbox
                label="Lembrar de mim"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSigningIn}
              />
              <a href="/recuperar-senha" className={styles.forgotLink}>
                Esqueceu sua senha?
              </a>
            </div>

            {displayError && (
              <div role="alert" className={styles.errorBanner}>
                {displayError}
              </div>
            )}

            <div className={styles.submitButton}>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={isSigningIn}
                disabled={isSigningIn}
              >
                Acessar Plataforma <ArrowRightIcon />
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className={styles.dividerRow} aria-hidden="true">
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>OU CONTINUE COM</span>
            <span className={styles.dividerLine} />
          </div>

          {/* Google button */}
          <button
            type="button"
            className={styles.googleButton}
            disabled={isSigningIn}
            aria-label="Entrar com Google Workspace"
          >
            <GoogleIcon />
            Google Workspace
          </button>

          {/* Notice */}
          <p className={styles.notice}>
            Seu acesso e credenciais chegam por e-mail corporativo assim que o plano da sua equipe
            for liberado.
          </p>

          {/* Footer */}
          <footer className={styles.footer}>
            <div className={styles.footerSecurity}>
              <ShieldIcon />
              <span>Ambiente seguro</span>
            </div>
            <p className={styles.footerHelp}>
              Precisa de ajuda?{' '}
              <a href="/suporte" className={styles.footerHelpLink}>
                Fale com o suporte
              </a>
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}
