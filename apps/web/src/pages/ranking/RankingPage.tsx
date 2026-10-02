// RankingPage — /app/ranking: rankings pra deixar numa TV, abertos a
// qualquer papel a partir do início. Dois tipos (?ranking=atividades):
// vendas (valor e clientes ganhos, meta do mês) e a "corrida" de ligações e
// visitas concluídas; semana ou mês (?periodo=semana|mes). Pódio dos 3
// primeiros e a classificação do 4º em diante. Atualiza sozinho a cada minuto (useSalesRankingQuery); o
// botão "Tela cheia" usa a Fullscreen API do navegador (modo apresentação).

import { Skeleton } from '@sylocrm/ui'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useActivityRankingQuery, useSalesRankingQuery } from '../../hooks/useDashboard'
import { useActiveOrganization } from '../../hooks/useOrganization'
import type {
  ActivityRankingEntry,
  SalesRankingEntry,
  SalesRankingPeriod,
} from '../../lib/dashboard-api'
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

function ExpandIcon() {
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
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  )
}

function ShrinkIcon() {
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
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  )
}

/** Modo apresentação: tela cheia de verdade (some a barra do navegador). */
function useFullscreen(): { active: boolean; toggle: () => void; supported: boolean } {
  const [active, setActive] = useState(() => Boolean(document.fullscreenElement))
  useEffect(() => {
    const onChange = () => setActive(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  function toggle() {
    const action = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen()
    action.catch((error: unknown) => {
      console.error('Fullscreen indisponível', error)
    })
  }
  return { active, toggle, supported: document.fullscreenEnabled }
}

const PERIOD_PARAM: Record<SalesRankingPeriod, string> = { week: 'semana', month: 'mes' }

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

/** Progresso da meta do mês — usa o ganho do mês mesmo no ranking da semana. */
function goalPercent(entry: SalesRankingEntry): number | null {
  if (!entry.goalCents) return null
  return Math.round((entry.monthWonCents / entry.goalCents) * 100)
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

type RankingKind = 'sales' | 'activities'

/** O que cada pódio/linha mostra — igual pros dois rankings, muda o conteúdo. */
interface RankRow {
  userId: string
  name: string
  avatarUrl: string | null
  streakDays: number
  /** Número grande do pódio (ex: "R$ 150.000" ou "12 atividades"). */
  headline: string
  /** Chip ao lado da ofensiva no pódio (ex: "3 clientes", "7 lig. · 5 visitas"). */
  detail: string
}

function salesRows(sellers: SalesRankingEntry[]): RankRow[] {
  return sellers.map((entry) => ({
    userId: entry.userId,
    name: entry.name,
    avatarUrl: entry.avatarUrl,
    streakDays: entry.streakDays,
    headline: `R$ ${formatBRL(entry.wonCents)}`,
    detail: clientsLabel(entry.wonCount),
  }))
}

function activityRows(sellers: ActivityRankingEntry[]): RankRow[] {
  return sellers.map((entry) => ({
    userId: entry.userId,
    name: entry.name,
    avatarUrl: entry.avatarUrl,
    streakDays: entry.streakDays,
    headline: entry.total === 1 ? '1 atividade' : `${entry.total} atividades`,
    detail: `${countLabel(entry.calls, 'ligação', 'ligações')} · ${countLabel(entry.visits, 'visita', 'visitas')}`,
  }))
}

function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function PodiumCard({
  row,
  place,
  label,
  medal,
}: {
  row: RankRow
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
        <img className={styles.podiumAvatar} src={row.avatarUrl ?? '/default-avatar.svg'} alt="" />
        <span className={styles.placeBadge}>{place}º</span>
      </div>
      <div className={styles.podiumCard}>
        <span className={styles.podiumLabel}>{label}</span>
        <span className={styles.podiumName}>{row.name}</span>
        <span className={styles.podiumValue}>{row.headline}</span>
        <div className={styles.podiumChips}>
          <span className={styles.chip}>{row.detail}</span>
          <span className={`${styles.chip} ${styles.chipStreak}`}>
            <FlameIcon />
            {daysLabel(row.streakDays)}
          </span>
        </div>
      </div>
    </div>
  )
}

function SellerCell({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <div className={styles.seller}>
      {avatarUrl ? (
        <img className={styles.sellerAvatar} src={avatarUrl} alt="" />
      ) : (
        <span className={styles.sellerInitials}>{initials(name)}</span>
      )}
      <span className={styles.sellerName}>{name}</span>
    </div>
  )
}

function StreakCell({ days }: { days: number }) {
  return (
    <span className={styles.streakCell}>
      <FlameIcon />
      {daysLabel(days)}
    </span>
  )
}

export function RankingPage() {
  const navigate = useNavigate()
  const { organizationId, membership } = useActiveOrganization()
  const [searchParams, setSearchParams] = useSearchParams()
  const kind: RankingKind = searchParams.get('ranking') === 'atividades' ? 'activities' : 'sales'
  // Sem período na URL: vendas abre no mês; ligações e visitas, na semana (a
  // "corrida da semana").
  const periodParam = searchParams.get('periodo')
  const period: SalesRankingPeriod =
    periodParam === 'semana'
      ? 'week'
      : periodParam === 'mes'
        ? 'month'
        : kind === 'activities'
          ? 'week'
          : 'month'
  // O topo (meta da operação) vem do ranking de vendas, que é sempre do mês.
  const sales = useSalesRankingQuery(organizationId, kind === 'sales' ? period : 'month')
  const activities = useActivityRankingQuery(organizationId, period, kind === 'activities')
  const current = kind === 'sales' ? sales : activities
  const fullscreen = useFullscreen()
  const now = useClock()

  function updateParams(next: { kind?: RankingKind; period?: SalesRankingPeriod }) {
    const nextKind = next.kind ?? kind
    const params: Record<string, string> = {}
    if (nextKind === 'activities') params.ranking = 'atividades'
    // Trocar de ranking volta pro período padrão dele.
    if (next.period) params.periodo = PERIOD_PARAM[next.period]
    else if (!next.kind && periodParam) params.periodo = periodParam
    setSearchParams(params, { replace: true })
  }

  const logoUrl = membership?.organizationIconUrl ?? null
  const org = sales.data?.organization
  const orgPercent =
    org?.goalCents && org.goalCents > 0
      ? Math.round((org.achievedCents / org.goalCents) * 100)
      : null
  const rows =
    kind === 'sales'
      ? salesRows(sales.data?.sellers ?? [])
      : activityRows(activities.data?.sellers ?? [])
  const top = rows.slice(0, 3)
  const salesRest = (sales.data?.sellers ?? []).slice(3)
  const activityRest = (activities.data?.sellers ?? []).slice(3)
  const periodWord = period === 'week' ? 'Semana' : 'Mês'
  const title =
    kind === 'sales'
      ? `Pódio de Campeões ${period === 'week' ? 'da Semana' : 'do Mês'}`
      : `Corrida ${period === 'week' ? 'da Semana' : 'do Mês'} — Ligações e Visitas`

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

        <div className={styles.headerButtons}>
          {fullscreen.supported && (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={fullscreen.toggle}
              aria-label={fullscreen.active ? 'Sair da tela cheia' : 'Tela cheia'}
              title={
                fullscreen.active ? 'Sair da tela cheia (Esc)' : 'Tela cheia (modo apresentação)'
              }
            >
              {fullscreen.active ? <ShrinkIcon /> : <ExpandIcon />}
            </button>
          )}
          {!fullscreen.active && (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => navigate('/app/home')}
              aria-label="Fechar ranking"
              title="Voltar pro início"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </header>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h1 className={styles.panelTitle}>{title}</h1>
          <div className={styles.toggles}>
            <fieldset className={styles.periodToggle} aria-label="Tipo de ranking">
              {(['sales', 'activities'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === kind ? styles.periodActive : styles.periodOption}
                  aria-pressed={option === kind}
                  onClick={() => updateParams({ kind: option })}
                >
                  {option === 'sales' ? 'Vendas' : 'Ligações e visitas'}
                </button>
              ))}
            </fieldset>
            <fieldset className={styles.periodToggle} aria-label="Período do ranking">
              {(['week', 'month'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === period ? styles.periodActive : styles.periodOption}
                  aria-pressed={option === period}
                  onClick={() => updateParams({ period: option })}
                >
                  {option === 'week' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </fieldset>
          </div>
        </div>
        {current.isLoading ? (
          <div className={styles.podium}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width="100%" height={220} />
            ))}
          </div>
        ) : current.isError ? (
          <p className={styles.empty}>
            Não foi possível carregar o ranking. Tentando de novo em instantes…
          </p>
        ) : top.length === 0 ? (
          <p className={styles.empty}>Nenhum vendedor na equipe ainda.</p>
        ) : (
          <div className={styles.podium}>
            {PODIUM.map(({ place, label, className }) => {
              const row = top[place - 1]
              return row ? (
                <PodiumCard key={place} row={row} place={place} label={label} medal={className} />
              ) : (
                <div key={place} className={styles.podiumSlot} />
              )
            })}
          </div>
        )}
      </section>

      {kind === 'sales' && salesRest.length > 0 && (
        <section className={styles.panel}>
          <h2 className={styles.tableTitle}>Classificação geral (4º em diante)</h2>
          <p className={styles.tableSub}>
            Clientes ganhos {period === 'week' ? 'na semana' : 'no mês'}, ofensiva e meta individual
            do mês
          </p>
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
              {salesRest.map((entry, index) => {
                const percent = goalPercent(entry)
                return (
                  <tr key={entry.userId}>
                    <td className={styles.colPos}>{index + 4}º</td>
                    <td>
                      <SellerCell name={entry.name} avatarUrl={entry.avatarUrl} />
                    </td>
                    <td className={styles.center}>
                      <span className={styles.countChip}>{clientsLabel(entry.wonCount)}</span>
                    </td>
                    <td className={styles.center}>
                      <StreakCell days={entry.streakDays} />
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
                          {percent === null ? 'Sem meta' : `${percent}% da meta do mês`}
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

      {kind === 'activities' && activityRest.length > 0 && (
        <section className={styles.panel}>
          <h2 className={styles.tableTitle}>Classificação geral (4º em diante)</h2>
          <p className={styles.tableSub}>
            Ligações e visitas concluídas {period === 'week' ? 'na semana' : 'no mês'}
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colPos}>Pos.</th>
                <th>Vendedor</th>
                <th className={styles.center}>Ligações</th>
                <th className={styles.center}>Visitas</th>
                <th className={styles.center}>Ofensiva</th>
                <th className={styles.right}>Total</th>
              </tr>
            </thead>
            <tbody>
              {activityRest.map((entry, index) => (
                <tr key={entry.userId}>
                  <td className={styles.colPos}>{index + 4}º</td>
                  <td>
                    <SellerCell name={entry.name} avatarUrl={entry.avatarUrl} />
                  </td>
                  <td className={styles.center}>
                    <span className={styles.countChip}>{entry.calls}</span>
                  </td>
                  <td className={styles.center}>
                    <span className={styles.countChip}>{entry.visits}</span>
                  </td>
                  <td className={styles.center}>
                    <StreakCell days={entry.streakDays} />
                  </td>
                  <td className={styles.right}>
                    <span className={styles.volumeValue}>{entry.total}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className={styles.periodFootnote}>
        {kind === 'sales' ? 'Vendas' : 'Ligações e visitas'} · {periodWord}
      </p>
    </main>
  )
}
