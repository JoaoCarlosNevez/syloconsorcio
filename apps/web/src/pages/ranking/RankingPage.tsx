// RankingPage — /app/ranking: ranking do mês em tela cheia (pra deixar numa
// TV), aberto a qualquer papel a partir do início. Pódio dos 3 primeiros e a
// classificação do 4º em diante, com clientes ganhos, ofensiva e meta.
// Atualiza sozinho a cada minuto (useSalesRankingQuery).

import { Skeleton } from '@sylocrm/ui'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSalesRankingQuery } from '../../hooks/useDashboard'
import { useActiveOrganization } from '../../hooks/useOrganization'
import type { SalesRankingEntry } from '../../lib/dashboard-api'
import { formatBRL } from '../../lib/lead-adapters'
import styles from './RankingPage.module.css'

function FlameIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 2.5s.9 3.2-1.4 6c-1.2 1.4-2.6 2.3-2.6 4.6a2.5 2.5 0 0 0 5 0c0-.8-.3-1.4-.3-1.4s2.8 1.1 2.8 4.8A5 5 0 0 1 12 21.5a6 6 0 0 1-6-6c0-5.5 7.5-8.2 7.5-13z" />
    </svg>
  )
}

function CrownIcon() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26" aria-hidden="true">
      <path
        d="M3 8l7 6 7-11 7 11 7-6-3 16H6L3 8z"
        fill="#F5C443"
        stroke="#C08A00"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function useClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')
  ).toUpperCase()
}

function goalPercent(entry: SalesRankingEntry): number | null {
  if (!entry.goalCents) return null
  return Math.round((entry.wonCents / entry.goalCents) * 100)
}

function clientsLabel(count: number): string {
  return count === 1 ? '1 cliente' : `${count} clientes`
}

function daysLabel(days: number): string {
  return days === 1 ? '1 dia' : `${days} dias`
}

const PODIUM = [
  { place: 2, label: 'Vice-líder', className: 'silver' },
  { place: 1, label: 'Líder geral', className: 'gold' },
  { place: 3, label: '3º colocado', className: 'bronze' },
] as const

function PodiumCard({
  entry,
  place,
  label,
  medal,
}: {
  entry: SalesRankingEntry
  place: number
  label: string
  medal: 'gold' | 'silver' | 'bronze'
}) {
  return (
    <div className={`${styles.podiumSlot} ${styles[medal]}`}>
      {place === 1 && (
        <span className={styles.crown}>
          <CrownIcon />
        </span>
      )}
      <div className={styles.podiumAvatarRing}>
        <img
          className={styles.podiumAvatar}
          src={entry.avatarUrl ?? '/default-avatar.svg'}
          alt=""
        />
        <span className={styles.placeBadge}>{place}º</span>
      </div>
      <div className={styles.podiumCard}>
        <span className={styles.podiumLabel}>{label}</span>
        <span className={styles.podiumName}>{entry.name}</span>
        <span className={styles.podiumValue}>R$ {formatBRL(entry.wonCents)}</span>
        <div className={styles.podiumChips}>
          <span className={styles.chip}>{clientsLabel(entry.wonCount)}</span>
          <span className={`${styles.chip} ${styles.chipStreak}`}>
            <FlameIcon />
            {daysLabel(entry.streakDays)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function RankingPage() {
  const navigate = useNavigate()
  const { organizationId, membership } = useActiveOrganization()
  const { data, isLoading, isError } = useSalesRankingQuery(organizationId)
  const now = useClock()
  const logoUrl = membership?.organizationIconUrl ?? null

  const org = data?.organization
  const orgPercent =
    org?.goalCents && org.goalCents > 0
      ? Math.round((org.achievedCents / org.goalCents) * 100)
      : null
  const top = data?.sellers.slice(0, 3) ?? []
  const rest = data?.sellers.slice(3) ?? []

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={membership?.organizationName ?? ''}
              className={styles.logoWhiteLabel}
            />
          ) : (
            <img src="/sylo-logo.png" alt="Sylo" className={styles.logo} />
          )}
        </div>

        <div className={styles.goalCard}>
          <div className={styles.goalText}>
            <span className={styles.goalLabel}>Meta mensal da operação</span>
            {org ? (
              <span className={styles.goalValue}>
                R$ {formatBRL(org.achievedCents)}
                {org.goalCents ? (
                  <span className={styles.goalTarget}> / R$ {formatBRL(org.goalCents)}</span>
                ) : null}
              </span>
            ) : (
              <Skeleton width={180} height={20} />
            )}
          </div>
          <div className={styles.goalProgress}>
            <span className={styles.goalPercent}>
              {orgPercent === null ? 'Sem meta definida' : `${orgPercent}% atingido`}
            </span>
            <div className={styles.goalTrack}>
              <div
                className={styles.goalFill}
                style={{ width: `${Math.min(100, orgPercent ?? 0)}%` }}
              />
            </div>
          </div>
        </div>

        <div className={styles.clock}>
          <span className={styles.clockTime}>
            {now.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
          <span className={styles.clockDate}>
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        <button
          type="button"
          className={styles.closeBtn}
          onClick={() => navigate('/app/home')}
          aria-label="Fechar ranking"
          title="Voltar pro início"
        >
          <CloseIcon />
        </button>
      </header>

      <section className={styles.panel}>
        <h1 className={styles.panelTitle}>Pódio de Campeões do Mês</h1>
        {isLoading ? (
          <div className={styles.podium}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width="100%" height={220} />
            ))}
          </div>
        ) : isError ? (
          <p className={styles.empty}>
            Não foi possível carregar o ranking. Tentando de novo em instantes…
          </p>
        ) : top.length === 0 ? (
          <p className={styles.empty}>Nenhum vendedor na equipe ainda.</p>
        ) : (
          <div className={styles.podium}>
            {PODIUM.map(({ place, label, className }) => {
              const entry = top[place - 1]
              return entry ? (
                <PodiumCard
                  key={place}
                  entry={entry}
                  place={place}
                  label={label}
                  medal={className}
                />
              ) : (
                <div key={place} className={styles.podiumSlot} />
              )
            })}
          </div>
        )}
      </section>

      {rest.length > 0 && (
        <section className={styles.panel}>
          <h2 className={styles.tableTitle}>Classificação geral (4º em diante)</h2>
          <p className={styles.tableSub}>Clientes ganhos, ofensiva e meta individual do mês</p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colPos}>Pos.</th>
                <th>Vendedor</th>
                <th className={styles.center}>Clientes ganhos</th>
                <th className={styles.center}>Ofensiva</th>
                <th className={styles.right}>Volume (meta)</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((entry, index) => {
                const percent = goalPercent(entry)
                return (
                  <tr key={entry.userId}>
                    <td className={styles.colPos}>{index + 4}º</td>
                    <td>
                      <div className={styles.seller}>
                        {entry.avatarUrl ? (
                          <img className={styles.sellerAvatar} src={entry.avatarUrl} alt="" />
                        ) : (
                          <span className={styles.sellerInitials}>{initials(entry.name)}</span>
                        )}
                        <span className={styles.sellerName}>{entry.name}</span>
                      </div>
                    </td>
                    <td className={styles.center}>
                      <span className={styles.countChip}>{clientsLabel(entry.wonCount)}</span>
                    </td>
                    <td className={styles.center}>
                      <span className={styles.streakCell}>
                        <FlameIcon />
                        {daysLabel(entry.streakDays)}
                      </span>
                    </td>
                    <td className={styles.right}>
                      <div className={styles.volume}>
                        <span className={styles.volumeValue}>R$ {formatBRL(entry.wonCents)}</span>
                        <div className={styles.volumeTrack}>
                          <div
                            className={styles.volumeFill}
                            style={{ width: `${Math.min(100, percent ?? 0)}%` }}
                          />
                        </div>
                        <span className={styles.volumePercent}>
                          {percent === null ? 'Sem meta' : `${percent}% da meta`}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}
    </main>
  )
}
