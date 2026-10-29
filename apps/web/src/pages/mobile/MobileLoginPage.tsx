// Login do app do celular (/m) — só e-mail e senha, sem o painel da Sara do
// login do computador. Aparece no lugar da tela quando não há sessão; depois
// de entrar, o usuário continua na mesma tela em que estava (ex: o link do push).

import { type FormEvent, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import styles from './Mobile.module.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function MobileLoginPage() {
  const { signIn, isSigningIn, signInError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const error = validationError ?? (signInError ? 'E-mail ou senha incorretos.' : null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setValidationError(null)
    if (!EMAIL_PATTERN.test(email.trim())) return setValidationError('Informe um e-mail válido.')
    if (password.length < 6) return setValidationError('A senha tem pelo menos 6 caracteres.')
    try {
      await signIn({ email: email.trim(), password })
    } catch {
      // A mensagem vem de signInError.
    }
  }

  return (
    <main className={styles.login}>
      <div className={styles.loginBrand}>
        <img src="/pwa-icon-192.png" alt="" className={styles.loginLogo} />
        SyloCRM
      </div>
      <div>
        <h1 className={styles.title}>Entrar</h1>
        <p className={styles.note}>Use o mesmo e-mail e senha do computador.</p>
      </div>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <label className={styles.field}>
          E-mail
          <input
            className={styles.input}
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          Senha
          <input
            className={styles.input}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={isSigningIn}
        >
          {isSigningIn ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className={styles.note}>Esqueceu a senha? Fale com o gestor da sua representação.</p>
    </main>
  )
}
