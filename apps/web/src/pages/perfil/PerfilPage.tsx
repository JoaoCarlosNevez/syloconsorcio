// PerfilPage — Perfil completo do consultor: nível, XP, ofensiva e conquistas.

import { type CSSProperties, type FormEvent, useState } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import { useAuth } from '../../hooks/useAuth'
import styles from './PerfilPage.module.css'

// ── Ícones ────────────────────────────────────────────────────────────────────

function BellIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function ShareIcon() {
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
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="8 21 12 21 16 21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <path d="M7 4H4a2 2 0 0 0-2 2v1a5 5 0 0 0 5 5h1" />
      <path d="M17 4h3a2 2 0 0 1 2 2v1a5 5 0 0 1-5 5h-1" />
      <path d="M7 4v10a5 5 0 0 0 10 0V4" />
      <line x1="7" y1="4" x2="17" y2="4" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const CURRENT_XP = 1840
const MAX_XP = 2200
const XP_PERCENT = Math.round((CURRENT_XP / MAX_XP) * 100)

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
// Seg a Sex = feito, Sáb/Dom = pendente (hoje = Sex)
const WEEK_STATUS: Array<'done' | 'today' | 'pending'> = [
  'done',
  'done',
  'done',
  'done',
  'today',
  'pending',
  'pending',
]

const METRICS = [
  { label: 'Leads\nAtendidos', value: '42', sub: '↑ 18% vs mês ant.', subGreen: true },
  { label: 'Simulações', value: '18', sub: 'Lances e parcelas', subGreen: false },
  { label: 'Propostas', value: '9', sub: '5 em negociação', subGreen: false },
  { label: 'Cotas\nFechadas', value: '4', sub: '+240 XP ganhos', subGreen: true },
]

const BADGES = [
  {
    emoji: '🚀',
    bg: '#fef3c7',
    name: 'Primeira Cota',
    desc: 'Vendeu a primeira cota de consórcio pelo Sylo CRM.',
    xp: '+100 XP',
    date: '14/01/2024',
    unlocked: true,
  },
  {
    emoji: '🔥',
    bg: '#ffedd5',
    name: 'Em Chamas',
    desc: '7 dias consecutivos com follow-ups em dia sem atrasos.',
    xp: '+150 XP',
    date: '21/01/2024',
    unlocked: true,
  },
  {
    emoji: '🏆',
    bg: '#fef3c7',
    name: 'Mestre do Lance',
    desc: 'Fechou consórcio com lance vencedor na primeira assembleia.',
    xp: '+200 XP',
    date: '03/02/2024',
    unlocked: true,
  },
  {
    emoji: '⚡',
    bg: '#ede9fe',
    name: 'Velocidade Sylo',
    desc: 'Registrou proposta em menos de 2h após o primeiro contato.',
    xp: '+120 XP',
    date: '15/02/2024',
    unlocked: true,
  },
  {
    emoji: '💎',
    bg: '#ede9fe',
    name: 'Diamante',
    desc: 'Atingiu o nível máximo de consultor na plataforma.',
    xp: '+500 XP',
    date: '10/03/2024',
    unlocked: true,
  },
  {
    emoji: '📈',
    bg: '#d1fae5',
    name: 'Crescimento 10x',
    desc: 'Aumentou conversão em 10x comparado ao mês anterior.',
    xp: '+300 XP',
    date: '01/04/2024',
    unlocked: true,
  },
  {
    emoji: '🔒',
    bg: '#f1f5f9',
    name: 'Sócio Estratégico',
    desc: 'Fechou 3 propostas em uma única semana.',
    xp: '+250 XP',
    date: null,
    unlocked: false,
  },
  {
    emoji: '🔒',
    bg: '#f1f5f9',
    name: 'Guru do Follow-up',
    desc: 'Manteve 30 dias consecutivos sem atraso em tarefas.',
    xp: '+400 XP',
    date: null,
    unlocked: false,
  },
]

// ── Tipos de badge ────────────────────────────────────────────────────────────

type BadgeData = (typeof BADGES)[number]

// ── BadgeModal ────────────────────────────────────────────────────────────────

function BadgeModal({ badge, onClose }: { badge: BadgeData; onClose: () => void }) {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop dismiss
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(11,28,48,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal stops propagation */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 380,
          boxShadow: '0 8px 40px rgba(11,28,48,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '32px 28px',
          gap: 12,
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 48,
            width: 80,
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: badge.bg,
            borderRadius: 20,
          }}
        >
          {badge.emoji}
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#0b1c30' }}>{badge.name}</span>
        <p style={{ fontSize: 14, color: '#565e74', margin: 0, lineHeight: 1.5 }}>{badge.desc}</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#047857',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 9999,
              padding: '3px 12px',
            }}
          >
            {badge.xp}
          </span>
          {badge.unlocked && badge.date && (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Desbloqueada em {badge.date}</span>
          )}
          {!badge.unlocked && (
            <span
              style={{
                fontSize: 12,
                color: '#94a3b8',
                background: '#f1f5f9',
                borderRadius: 9999,
                padding: '3px 12px',
              }}
            >
              🔒 Não desbloqueada
            </span>
          )}
        </div>
        {!badge.unlocked && (
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, marginTop: 4 }}>
            Complete o desafio para desbloquear esta conquista.
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 8,
            padding: '8px 24px',
            background: 'linear-gradient(to right,#ffeab1,#ffa705)',
            border: 'none',
            borderRadius: 8,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            color: '#0b1c30',
            cursor: 'pointer',
          }}
        >
          Fechar
        </button>
      </div>
    </div>
  )
}

// ── EditProfileModal ──────────────────────────────────────────────────────────

interface ProfileData {
  name: string
  handle: string
  location: string
}

function EditProfileModal({
  initial,
  onClose,
  onSave,
}: { initial: ProfileData; onClose: () => void; onSave: (d: ProfileData) => void }) {
  const [name, setName] = useState(initial.name)
  const [handle, setHandle] = useState(initial.handle)
  const [location, setLocation] = useState(initial.location)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSave({
      name: name.trim() || initial.name,
      handle: handle.trim() || initial.handle,
      location: location.trim() || initial.location,
    })
  }

  const inp: CSSProperties = {
    height: 38,
    border: '1px solid rgba(216,195,173,0.4)',
    borderRadius: 8,
    padding: '0 12px',
    fontFamily: 'inherit',
    fontSize: 14,
    color: '#0b1c30',
    background: '#f8f9ff',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }
  const lbl: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    color: '#565e74',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop dismiss
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(11,28,48,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal stops propagation */}
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 8px 40px rgba(11,28,48,0.18)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
            borderBottom: '1px solid rgba(216,195,173,0.3)',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0b1c30' }}>Editar Perfil</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
            aria-label="Fechar"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 22 }}
          onSubmit={handleSubmit}
        >
          <label style={lbl}>
            Nome
            <input style={inp} type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label style={lbl}>
            Handle
            <input
              style={inp}
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@handle"
            />
          </label>
          <label style={lbl}>
            Localização
            <input
              style={inp}
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'none',
                border: '1px solid rgba(216,195,173,0.5)',
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
                background: 'linear-gradient(to right,#ffeab1,#ffa705)',
                border: 'none',
                borderRadius: 8,
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                color: '#0b1c30',
                cursor: 'pointer',
              }}
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── PerfilPage ─────────────────────────────────────────────────────────────────

const ACTIVITY_TYPES = [
  '☎️ Ligação',
  '💬 WhatsApp',
  '📧 E-mail',
  '🤝 Reunião',
  '📄 Proposta Enviada',
  '🏆 Venda Fechada',
]

export function PerfilPage() {
  const { user } = useAuth()
  const emailPrefix = user?.email?.split('@')[0] ?? 'consultor'
  const [selectedBadge, setSelectedBadge] = useState<BadgeData | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [activityToast, setActivityToast] = useState('')
  const [profile, setProfile] = useState({
    name: 'Ennyo Café',
    handle: `@${emailPrefix}`,
    location: 'São Paulo, SP',
  })

  return (
    <AppLayout>
      {selectedBadge && <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />}
      {editingProfile && (
        <EditProfileModal
          initial={profile}
          onClose={() => setEditingProfile(false)}
          onSave={(d) => {
            setProfile(d)
            setEditingProfile(false)
          }}
        />
      )}
      {activityOpen && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop dismiss
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 400,
            background: 'rgba(11,28,48,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setActivityOpen(false)}
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal stops propagation */}
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              width: 340,
              boxShadow: '0 8px 40px rgba(11,28,48,0.18)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #e9ecef' }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0b1c30' }}>
                Registrar Atividade
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                Selecione o tipo de atividade realizada hoje
              </p>
            </div>
            <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {ACTIVITY_TYPES.map((act) => (
                <button
                  key={act}
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    borderRadius: 8,
                    fontFamily: 'inherit',
                    fontSize: 14,
                    color: '#0f172a',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = '#f1f5f9'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'none'
                  }}
                  onClick={() => {
                    setActivityToast(`✓ ${act} registrada!`)
                    setActivityOpen(false)
                    setTimeout(() => setActivityToast(''), 3000)
                  }}
                >
                  {act}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {activityToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 600,
            background: '#0b1c30',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            whiteSpace: 'nowrap',
          }}
        >
          {activityToast}
        </div>
      )}
      <div className={styles.page}>
        {/* ── Barra de ações ──────────────────────────────────────────────────── */}
        <div className={styles.topBar}>
          <div className={styles.topBarActions}>
            <button type="button" className={styles.iconBtn} aria-label="Notificações">
              <BellIcon />
              <span className={styles.notifDot} aria-hidden="true" />
            </button>
            <button type="button" className={styles.iconBtn} aria-label="Configurações">
              <SettingsIcon />
            </button>
            <span className={styles.topBarDivider} aria-hidden="true" />
            <button type="button" className={styles.shareBtn}>
              <ShareIcon />
              Compartilhar Perfil
            </button>
          </div>
        </div>

        {/* ── Seção 1: Cabeçalho do perfil ────────────────────────────────────── */}
        <div className={styles.profileCard}>
          {/* Banner */}
          <div className={styles.coverBanner}>
            <div className={styles.coverPattern} aria-hidden="true" />
            <button
              type="button"
              className={styles.editBannerBtn}
              onClick={() => setEditingProfile(true)}
            >
              <PencilIcon />
              Editar Perfil
            </button>
          </div>

          {/* Avatar + info */}
          <div className={styles.profileBody}>
            <div className={styles.profileMain}>
              <div className={styles.avatarWrap}>
                <img src="/sara-profile.png" alt={emailPrefix} className={styles.avatar} />
              </div>
              <div className={styles.profileInfo}>
                <div className={styles.profileNameRow}>
                  <h1 className={styles.profileName}>{profile.name}</h1>
                  <span className={styles.tierBadge}>Diamante</span>
                  <span className={styles.profileHandle}>{profile.handle}</span>
                </div>
                <div className={styles.profileMetaRow}>
                  <span className={styles.profileMeta}>Equipe de Porthis, {profile.location}</span>
                  <span className={styles.profileMetaDot} aria-hidden="true" />
                  <span className={styles.profileMeta}>
                    <LocationIcon />
                    Membro desde Janeiro de 2024
                  </span>
                </div>
              </div>
            </div>

            {/* XP progress */}
            <div className={styles.xpSection}>
              <div className={styles.xpLabels}>
                <span className={styles.xpLabel}>
                  <StarIcon />
                  Progresso para Nível 4 (Mestre em Fechamentos)
                </span>
                <span className={styles.xpValues}>
                  <strong>{CURRENT_XP.toLocaleString('pt-BR')} XP</strong>
                  <span className={styles.xpDivider}>
                    {' '}
                    / {MAX_XP.toLocaleString('pt-BR')} XP •{' '}
                  </span>
                  <span className={styles.xpRemaining}>
                    Faltam {(MAX_XP - CURRENT_XP).toLocaleString('pt-BR')} XP
                  </span>
                </span>
              </div>
              <div
                className={styles.xpBar}
                role="progressbar"
                aria-valuenow={XP_PERCENT}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="XP para próximo nível"
                tabIndex={0}
              >
                <div className={styles.xpFill} style={{ width: `${XP_PERCENT}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Corpo principal: conteúdo + sidebar de nível ────────────────────── */}
        <div className={styles.bodyGrid}>
          <div className={styles.bodyMain}>
            {/* ── Seção 3: Ofensiva + Métricas ────────────────────────────────────── */}
            <div className={styles.midGrid}>
              {/* Ofensiva de Vendas */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h2 className={styles.cardTitle}>Ofensiva de Vendas</h2>
                  </div>
                  <span className={styles.recordBadge}>Recorde: 21 Dias</span>
                </div>

                <div className={styles.streakBox}>
                  <p className={styles.streakLabel}>OFENSIVA SEMANAL ATIVA</p>
                  <p className={styles.streakValue}>14 Dias Seguidos</p>
                </div>

                <div className={styles.weekCalendar}>
                  <div className={styles.weekHeader}>
                    <span className={styles.weekPeriod}>Esta semana</span>
                    <span className={styles.weekPeriod}>Set 2026</span>
                  </div>
                  <div className={styles.weekDays}>
                    {WEEK_DAYS.map((day, i) => {
                      const status = WEEK_STATUS[i]
                      return (
                        <div
                          key={day}
                          className={[styles.weekDay, status ? styles[status] : '']
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <span className={styles.weekDayLabel}>{day}</span>
                          <span className={styles.weekDayCheck}>
                            {status === 'done' ? '✓' : status === 'today' ? '✓' : '·'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.streakActionBtn}
                  onClick={() => setActivityOpen(true)}
                >
                  Registrar Atividade de Hoje
                </button>
              </div>

              {/* Métricas operacionais */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Engajamento Operacional do Ciclo</h2>
                  <span className={styles.periodBadge}>Últimos 30 dias</span>
                </div>

                <div className={styles.metricsGrid}>
                  {METRICS.map((m) => (
                    <div key={m.label} className={styles.metricCard}>
                      <p className={styles.metricLabel}>{m.label}</p>
                      <p className={styles.metricValue}>{m.value}</p>
                      <p
                        className={[styles.metricSub, m.subGreen ? styles.metricSubGreen : '']
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {m.sub}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Seção 4: Mural de Conquistas ────────────────────────────────────── */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Mural de Conquistas</h2>
                  <p className={styles.cardSubtitle}>
                    Reconhecimento oficial por marcos de produtividade, velocidade e volume em
                    consórcios.
                  </p>
                </div>
                <div className={styles.badgeProgress}>
                  <span className={styles.badgeProgressLabel}>
                    {BADGES.filter((b) => b.unlocked).length} de {BADGES.length} desbloqueadas (
                    {Math.round((BADGES.filter((b) => b.unlocked).length / BADGES.length) * 100)}%)
                  </span>
                  <div className={styles.badgeProgressBar}>
                    <div
                      className={styles.badgeProgressFill}
                      style={{
                        width: `${(BADGES.filter((b) => b.unlocked).length / BADGES.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.badgesGrid}>
                {BADGES.map((badge) => (
                  // biome-ignore lint/a11y/useKeyWithClickEvents: badge card click
                  <div
                    key={badge.name}
                    className={[
                      styles.badgeCard,
                      badge.unlocked ? styles.badgeUnlocked : styles.badgeLocked,
                    ].join(' ')}
                    onClick={() => setSelectedBadge(badge)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.badgeCardTop}>
                      <div className={styles.badgeEmoji} style={{ background: badge.bg }}>
                        {badge.emoji}
                      </div>
                      {badge.unlocked ? (
                        <span className={styles.unlockedBadge}>
                          <TrophyIcon />
                          Desbloqueada
                        </span>
                      ) : (
                        <span className={styles.lockedBadge}>Bloqueada</span>
                      )}
                    </div>
                    <h3 className={styles.badgeName}>{badge.name}</h3>
                    <p className={styles.badgeDesc}>{badge.desc}</p>
                    <div className={styles.badgeFooter}>
                      <span className={styles.badgeXP}>{badge.xp}</span>
                      {badge.date && <span className={styles.badgeDate}>Em {badge.date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* bodyMain */}

          {/* ── Sidebar lateral: nível + próximos passos ─────────────────────── */}
          <aside className={styles.bodySidebar}>
            {/* Card: Nível atual */}
            <div className={styles.sideCard}>
              <div className={styles.sideCardTitle}>Nível & Evolução</div>

              <div className={styles.levelSteps}>
                {[
                  { num: 1, label: 'Iniciante Sylo', xp: '0 XP', done: true },
                  { num: 2, label: 'Consultor Ágil', xp: '500 XP', done: true },
                  { num: 3, label: 'Especialista', xp: '1.000 XP', current: true },
                  { num: 4, label: 'Mestre em Fechamentos', xp: '2.200 XP', done: false },
                ].map((step, i, arr) => (
                  <div key={step.num} className={styles.levelStep}>
                    <div className={styles.levelStepLeft}>
                      <div
                        className={[
                          styles.levelDot,
                          step.done
                            ? styles.levelDotDone
                            : step.current
                              ? styles.levelDotCurrent
                              : styles.levelDotPending,
                        ].join(' ')}
                      >
                        {step.done ? '✓' : step.num}
                      </div>
                      {i < arr.length - 1 && (
                        <div
                          className={[
                            styles.levelLine,
                            step.done ? styles.levelLineDone : styles.levelLinePending,
                          ].join(' ')}
                        />
                      )}
                    </div>
                    <div className={styles.levelStepInfo}>
                      <span
                        className={[
                          styles.levelStepLabel,
                          step.current ? styles.levelStepCurrent : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {step.label}
                      </span>
                      <span className={styles.levelStepXP}>{step.xp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card: XP resumo */}
            <div className={styles.sideCard}>
              <div className={styles.sideCardTitle}>XP do Mês</div>
              <div className={styles.xpSummary}>
                {[
                  { label: 'Leads atendidos', xp: '+84 XP' },
                  { label: 'Simulações', xp: '+54 XP' },
                  { label: 'Cotas fechadas', xp: '+240 XP' },
                  { label: 'Ofensiva ativa', xp: '+30 XP' },
                  { label: 'Conquistas', xp: '+350 XP' },
                ].map((item) => (
                  <div key={item.label} className={styles.xpSummaryRow}>
                    <span className={styles.xpSummaryLabel}>{item.label}</span>
                    <span className={styles.xpSummaryValue}>{item.xp}</span>
                  </div>
                ))}
                <div className={styles.xpSummaryTotal}>
                  <span>Total do mês</span>
                  <span>+758 XP</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
        {/* bodyGrid */}
      </div>
    </AppLayout>
  )
}
