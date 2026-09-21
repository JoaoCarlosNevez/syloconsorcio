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

// ── RecoveryModal ─────────────────────────────────────────────────────────────

function RecoveryModal({ onClose }: { onClose: () => void }) {
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [sent, setSent] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (recoveryEmail.trim()) setSent(true)
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop dismiss
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'rgba(11,28,48,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal stops propagation */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 8px 40px rgba(11,28,48,0.18)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '22px 24px', borderBottom: '1px solid #e9ecef' }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0b1c30' }}>
            Recuperar senha
          </p>
        </div>
        {sent ? (
          <div style={{ padding: '28px 24px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: '#0b1c30' }}>
              E-mail enviado!
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#565e74', lineHeight: 1.5 }}>
              Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 20px',
                background: '#0b1c30',
                border: 'none',
                borderRadius: 8,
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        ) : (
          <form
            style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24 }}
            onSubmit={handleSubmit}
          >
            <p style={{ margin: 0, fontSize: 13, color: '#565e74', lineHeight: 1.5 }}>
              Informe seu e-mail corporativo. Enviaremos um link para você redefinir sua senha.
            </p>
            <input
              type="email"
              placeholder="seu.email@empresa.com.br"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              style={{
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '10px 12px',
                fontFamily: 'inherit',
                fontSize: 14,
                color: '#0b1c30',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#565e74',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 18px',
                  background: '#0b1c30',
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Enviar link
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

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
  const [recoveryOpen, setRecoveryOpen] = useState(false)

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
    <>
      {recoveryOpen && <RecoveryModal onClose={() => setRecoveryOpen(false)} />}
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
                <button
                  type="button"
                  className={styles.forgotLink}
                  onClick={() => setRecoveryOpen(true)}
                >
                  Esqueceu sua senha?
                </button>
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
    </>
  )
}
