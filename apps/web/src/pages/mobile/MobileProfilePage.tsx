// Perfil no celular: foto, meta do mês, dados pessoais, troca de senha, troca
// de organização e o "sair". Mesmos endpoints da tela de Perfil do desktop.

import { Skeleton } from '@sylocrm/ui'
import { type ChangeEvent, type FormEvent, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  useCurrentUser,
  useRemoveMyAvatar,
  useUpdateMyProfile,
  useUploadMyAvatar,
} from '../../hooks/useCurrentUser'
import { useMobileProfile } from '../../hooks/useMobileProfile'
import { forgetActiveOrganization, useActiveOrganization } from '../../hooks/useOrganization'
import { useSalesGoalsSummaryQuery, useUpdateMyPersonalGoal } from '../../hooks/useTeam'
import { validateIconFile } from '../../lib/icon-validation'
import { showsSalesGoal } from '../../lib/mobile-profile'
import {
  businessDaysRemaining,
  formatGoalBRL,
  formatGoalInput,
  goalInputToCents,
  toGoalProgressView,
} from '../../lib/sales-goals'
import { supabase } from '../../lib/supabase'
import { unsubscribeFromPush } from '../../lib/web-push'
import { GoalBar } from './HomeParts'
import styles from './Mobile.module.css'
import { Sheet, useToast } from './MobileUi'
import { CameraIcon, LockIcon, PencilIcon } from './icons'

const ROLE_LABEL: Record<'ADMIN' | 'MANAGER' | 'BACKOFFICE' | 'SELLER', string> = {
  ADMIN: 'Dono',
  MANAGER: 'Supervisor',
  BACKOFFICE: 'Administrativo',
  SELLER: 'Vendedor',
}

const MIN_PASSWORD_LENGTH = 6

type OpenSheet = 'dados' | 'meta' | 'senha' | 'foto' | null

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function MobileProfilePage() {
  const { signOut } = useAuth()
  const { data: user, isLoading } = useCurrentUser()
  const { organizationId, membership, memberships, setActiveOrganizationId } =
    useActiveOrganization()
  const { profile } = useMobileProfile()
  const toast = useToast()
  const [sheet, setSheet] = useState<OpenSheet>(null)

  async function logout() {
    // Sai do push primeiro: o aparelho não deve receber avisos de quem saiu.
    try {
      await unsubscribeFromPush()
    } catch (error) {
      console.error('[pwa] não deu pra desinscrever o push', error)
    }
    await signOut()
    // Recarrega do zero: nada da conta anterior (organização escolhida, cache
    // das consultas) passa pra próxima pessoa que entrar neste celular.
    forgetActiveOrganization()
    window.location.replace('/m')
  }

  function done(message: string) {
    setSheet(null)
    toast.show(message)
  }

  return (
    <main className={styles.content}>
      <div className={styles.top}>
        <h1 className={styles.title}>Perfil</h1>
      </div>

      <section className={`${styles.card} ${styles.profileHead}`}>
        <button
          type="button"
          className={`${styles.avatar} ${styles.profileAvatar}`}
          onClick={() => setSheet('foto')}
          aria-label="Trocar foto de perfil"
        >
          <span className={styles.avatarInner}>
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user?.name ?? '?')}
          </span>
          <span className={styles.profileAvatarBadge}>
            <CameraIcon />
          </span>
        </button>
        {isLoading ? (
          <div className={styles.grow}>
            <Skeleton width="70%" height={20} />
            <Skeleton width="50%" height={14} />
          </div>
        ) : (
          <div className={styles.grow}>
            <strong className={styles.profileName}>{user?.name ?? user?.email}</strong>
            <span className={styles.rowSub}>{user?.email}</span>
            {membership && (
              <span className={styles.rowSub}>
                {ROLE_LABEL[membership.role]} · {membership.organizationName}
              </span>
            )}
          </div>
        )}
      </section>

      {showsSalesGoal(profile) && organizationId && (
        <GoalCard organizationId={organizationId} onEdit={() => setSheet('meta')} />
      )}

      <section>
        <h2 className={styles.sectionTitle}>Conta</h2>
        <div className={`${styles.card} ${styles.list}`}>
          <button type="button" className={styles.row} onClick={() => setSheet('dados')}>
            <span className={styles.iconBox}>
              <PencilIcon />
            </span>
            <div className={styles.grow}>
              <span className={styles.rowTitle}>Editar dados</span>
              <div className={styles.rowSub}>Nome, Instagram e cidade</div>
            </div>
          </button>
          <button type="button" className={styles.row} onClick={() => setSheet('foto')}>
            <span className={styles.iconBox}>
              <CameraIcon />
            </span>
            <div className={styles.grow}>
              <span className={styles.rowTitle}>Foto de perfil</span>
              <div className={styles.rowSub}>JPG, PNG ou WEBP até 2 MB</div>
            </div>
          </button>
          <button type="button" className={styles.row} onClick={() => setSheet('senha')}>
            <span className={styles.iconBox}>
              <LockIcon />
            </span>
            <div className={styles.grow}>
              <span className={styles.rowTitle}>Trocar senha</span>
              <div className={styles.rowSub}>Senha de acesso ao SyloCRM</div>
            </div>
          </button>
        </div>
      </section>

      {memberships.length > 1 && (
        <section>
          <h2 className={styles.sectionTitle}>Organização</h2>
          <div className={styles.options}>
            {memberships.map((m) => (
              <button
                key={m.organizationId}
                type="button"
                className={`${styles.option} ${m.organizationId === membership?.organizationId ? styles.optionOn : ''}`}
                onClick={() => setActiveOrganizationId(m.organizationId)}
              >
                {m.organizationName}
              </button>
            ))}
          </div>
        </section>
      )}

      <button type="button" className={`${styles.btn} ${styles.btnLine}`} onClick={logout}>
        Sair
      </button>

      {sheet === 'dados' && <EditDataSheet onClose={() => setSheet(null)} onDone={done} />}
      {sheet === 'meta' && organizationId && (
        <EditGoalSheet
          organizationId={organizationId}
          onClose={() => setSheet(null)}
          onDone={done}
        />
      )}
      {sheet === 'senha' && <PasswordSheet onClose={() => setSheet(null)} onDone={done} />}
      {sheet === 'foto' && <PhotoSheet onClose={() => setSheet(null)} onDone={done} />}
      {toast.node}
    </main>
  )
}

// ── Meta do mês ──────────────────────────────────────────────────────────────

function GoalCard({ organizationId, onEdit }: { organizationId: string; onEdit: () => void }) {
  const { data, isLoading, isError, refetch } = useSalesGoalsSummaryQuery(organizationId)

  if (isError) {
    return (
      <section className={`${styles.card} ${styles.goalCard}`}>
        <span className={styles.statLabel}>Meta do mês</span>
        <p className={styles.note}>Não deu pra carregar a meta.</p>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnLine}`}
          onClick={() => refetch()}
        >
          Tentar de novo
        </button>
      </section>
    )
  }
  if (isLoading || !data) return <Skeleton width="100%" height={132} />

  const { personal } = data
  const view = toGoalProgressView(personal)
  const team = toGoalProgressView({
    goalCents: personal.teamGoalCents,
    achievedCents: personal.achievedCents,
  })
  const days = businessDaysRemaining(data.periodEnd)

  return (
    <section className={`${styles.card} ${styles.goalCard}`}>
      <div className={styles.goalHead}>
        <span className={styles.statLabel}>Meta pessoal do mês</span>
        <button type="button" className={styles.link} onClick={onEdit}>
          {view.hasGoal ? 'Editar' : 'Definir meta'}
        </button>
      </div>
      <div className={styles.goalHead}>
        <strong>{formatGoalBRL(personal.achievedCents)}</strong>
        <span className={styles.note}>
          {view.hasGoal
            ? `${view.percent}% de ${formatGoalBRL(personal.goalCents ?? 0)}`
            : 'sem meta pessoal'}
        </span>
      </div>
      {view.hasGoal && <GoalBar percent={view.barPercent} />}
      {view.hasGoal && (
        <span className={styles.statCaption}>
          {view.reached
            ? 'Meta batida! 🎉'
            : `Faltam ${formatGoalBRL(view.remainingCents)} · ${days} dia${days === 1 ? '' : 's'} út${days === 1 ? 'il' : 'eis'}`}
        </span>
      )}
      {team.hasGoal && (
        <span className={styles.statCaption}>
          Meta da equipe pra você: {formatGoalBRL(personal.teamGoalCents ?? 0)} ({team.percent}%)
        </span>
      )}
    </section>
  )
}

function EditGoalSheet({
  organizationId,
  onClose,
  onDone,
}: {
  organizationId: string
  onClose: () => void
  onDone: (message: string) => void
}) {
  const { data } = useSalesGoalsSummaryQuery(organizationId)
  const updateGoal = useUpdateMyPersonalGoal(organizationId)
  const saved = data?.personal.goalCents ?? null
  const [value, setValue] = useState(saved !== null ? formatGoalInput(String(saved / 100)) : '')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await updateGoal.mutateAsync(goalInputToCents(value))
      onDone('Meta atualizada!')
    } catch (err) {
      setError(errorMessage(err, 'Não deu pra salvar a meta.'))
    }
  }

  return (
    <Sheet onClose={onClose}>
      <h3>Meta pessoal do mês</h3>
      <form className={styles.form} onSubmit={onSubmit}>
        <label className={styles.field}>
          Meta em crédito (R$)
          <input
            className={styles.input}
            value={value}
            onChange={(e) => setValue(formatGoalInput(e.target.value))}
            inputMode="numeric"
            placeholder="0"
          />
        </label>
        <p className={styles.note}>
          Pode ser maior que a meta que a equipe definiu pra você. Deixe em branco pra ficar sem
          meta.
        </p>
        {error && <p className={styles.error}>{error}</p>}
        <button
          type="submit"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={updateGoal.isPending}
        >
          {updateGoal.isPending ? 'Salvando…' : 'Salvar meta'}
        </button>
      </form>
    </Sheet>
  )
}

// ── Dados pessoais ───────────────────────────────────────────────────────────

function EditDataSheet({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: (message: string) => void
}) {
  const { data: user } = useCurrentUser()
  const updateProfile = useUpdateMyProfile()
  const [name, setName] = useState(user?.name ?? '')
  const [instagram, setInstagram] = useState(user?.instagramHandle ?? '')
  const [location, setLocation] = useState(user?.location ?? '')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Informe seu nome completo.')
    try {
      await updateProfile.mutateAsync({
        name: name.trim(),
        instagramHandle: instagram.trim() || null,
        location: location.trim() || null,
      })
      onDone('Perfil atualizado!')
    } catch (err) {
      setError(errorMessage(err, 'Não deu pra salvar o perfil.'))
    }
  }

  return (
    <Sheet onClose={onClose}>
      <h3>Editar dados</h3>
      <form className={styles.form} onSubmit={onSubmit}>
        <label className={styles.field}>
          Nome completo
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </label>
        <label className={styles.field}>
          Instagram
          <input
            className={styles.input}
            value={instagram}
            onChange={(e) => setInstagram(e.target.value.replace(/^@/, ''))}
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="seu.instagram"
          />
        </label>
        <label className={styles.field}>
          Cidade / Região
          <input
            className={styles.input}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="São Paulo, SP"
          />
        </label>
        <label className={styles.field}>
          E-mail
          <input className={styles.input} value={user?.email ?? ''} disabled />
        </label>
        <p className={styles.note}>O e-mail é gerenciado pelo administrador da organização.</p>
        {error && <p className={styles.error}>{error}</p>}
        <button
          type="submit"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
    </Sheet>
  )
}

// ── Senha ────────────────────────────────────────────────────────────────────

function PasswordSheet({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: (message: string) => void
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
    }
    if (password !== confirm) return setError('As senhas não coincidem.')
    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (updateError) return setError(updateError.message)
    onDone('Senha alterada!')
  }

  return (
    <Sheet onClose={onClose}>
      <h3>Trocar senha</h3>
      <form className={styles.form} onSubmit={onSubmit}>
        <label className={styles.field}>
          Nova senha
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <label className={styles.field}>
          Confirmar nova senha
          <input
            className={styles.input}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar senha'}
        </button>
      </form>
    </Sheet>
  )
}

// ── Foto ─────────────────────────────────────────────────────────────────────

function PhotoSheet({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: (message: string) => void
}) {
  const { data: user } = useCurrentUser()
  const uploadAvatar = useUploadMyAvatar()
  const removeAvatar = useRemoveMyAvatar()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    const invalid = await validateIconFile(file, { requireSquare: false })
    if (invalid) return setError(invalid)
    try {
      await uploadAvatar.mutateAsync(file)
      onDone('Foto atualizada!')
    } catch (err) {
      setError(errorMessage(err, 'Não deu pra enviar a foto.'))
    }
  }

  async function onRemove() {
    setError(null)
    try {
      await removeAvatar.mutateAsync()
      onDone('Foto removida.')
    } catch (err) {
      setError(errorMessage(err, 'Não deu pra remover a foto.'))
    }
  }

  return (
    <Sheet onClose={onClose}>
      <h3>Foto de perfil</h3>
      <p className={styles.note}>JPG, PNG ou WEBP, até 2 MB.</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={onFile}
      />
      {error && <p className={styles.error}>{error}</p>}
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={() => inputRef.current?.click()}
        disabled={uploadAvatar.isPending}
      >
        <CameraIcon />
        {uploadAvatar.isPending ? 'Enviando…' : 'Escolher foto'}
      </button>
      {user?.avatarUrl && (
        <button
          type="button"
          className={`${styles.btn} ${styles.btnLine} ${styles.linkDanger}`}
          onClick={onRemove}
          disabled={removeAvatar.isPending}
        >
          {removeAvatar.isPending ? 'Removendo…' : 'Remover foto'}
        </button>
      )}
    </Sheet>
  )
}
