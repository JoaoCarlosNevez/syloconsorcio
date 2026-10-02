// RaceTrack — a "corrida" de ligações e visitas: uma pista por vendedor, com
// um carrinho e a foto dele em cima. O líder anda com o tempo e cruza a
// chegada no fim do período; os outros vêm atrás na proporção das atividades
// (ver race.ts).

import type { ActivityRankingEntry, SalesRankingPeriod } from '../../lib/dashboard-api'
import styles from './RaceTrack.module.css'
import { FINAL_STRETCH, elapsedFraction, racePosition } from './race'

/** Cores dos carrinhos, por posição. */
const CAR_COLORS = [
  '#f59e0b',
  '#94a3b8',
  '#c2703d',
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
  '#ec4899',
  '#6366f1',
]

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/** Carro de F1 de perfil, virado pra chegada. A foto do vendedor fica no
 * cockpit, no lugar do capacete. */
function Car({ color }: { color: string }) {
  return (
    <svg className={styles.car} width="132" height="43" viewBox="0 0 104 34" aria-hidden="true">
      {/* Asa traseira */}
      <rect x="1" y="4" width="15" height="4" rx="1" fill={color} />
      <rect x="4" y="7" width="4" height="13" fill="#1f2937" />
      {/* Carroceria */}
      <path
        d="M6 22 L8 16 L26 15 L38 11 L50 10 L56 12 L60 16 L84 20 L97 23 Q100 24 100 26 L100 27 L6 27 Z"
        fill={color}
        stroke="rgba(15,23,42,0.35)"
        strokeWidth="0.8"
      />
      {/* Entrada de ar e sidepod */}
      <path d="M30 18 L44 14 L46 22 L30 23 Z" fill="rgba(15,23,42,0.35)" />
      {/* Faixa */}
      <path d="M58 20 L96 25 L96 26 L58 22 Z" fill="#fff" opacity="0.85" />
      {/* Cockpit (a foto entra aqui) */}
      <path d="M44 11 L54 11 L57 15 L44 15 Z" fill="#0f172a" />
      {/* Asa dianteira */}
      <rect x="84" y="27" width="19" height="3" rx="1" fill={color} />
      <rect x="99" y="23" width="4" height="7" rx="1" fill="#1f2937" />
      {/* Pneus */}
      <circle cx="20" cy="25" r="8.5" fill="#111827" />
      <circle cx="20" cy="25" r="3.5" fill="#6b7280" />
      <circle cx="80" cy="26" r="7" fill="#111827" />
      <circle cx="80" cy="26" r="3" fill="#6b7280" />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 21V4" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 4h14l-3 4 3 4H5" fill="#0f172a" />
      <path d="M8 4h3v4H8zM14 4h3v4h-3zM11 8h3v4h-3z" fill="#fff" />
    </svg>
  )
}

function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

export function RaceTrack({
  sellers,
  period,
  periodStart,
  periodEnd,
  now,
}: {
  sellers: ActivityRankingEntry[]
  period: SalesRankingPeriod
  periodStart: string
  periodEnd: string
  now: number
}) {
  const elapsed = elapsedFraction(periodStart, periodEnd, now)
  const leaderTotal = sellers[0]?.total ?? 0

  return (
    <div className={styles.race}>
      <div className={styles.ruler} aria-hidden="true">
        <span className={styles.rulerLabel}>Largada</span>
        <div className={styles.rulerTicks}>
          {period === 'week' &&
            WEEK_DAYS.map((day) => (
              <span key={day} className={styles.rulerTick}>
                {day}
              </span>
            ))}
        </div>
        <span className={styles.rulerLabel}>Chegada</span>
      </div>

      {sellers.map((seller, index) => {
        const position = racePosition(seller.total, leaderTotal, elapsed)
        const isLeader = index === 0 && seller.total > 0
        return (
          <div key={seller.userId} className={styles.lane}>
            <div className={styles.laneInfo}>
              <span className={styles.lanePlace}>{index + 1}º</span>
              <span className={styles.laneName}>{seller.name}</span>
            </div>

            <div className={styles.track}>
              <div className={styles.trackLine} />
              <div className={styles.finish}>
                <FlagIcon />
              </div>
              <div
                className={styles.racer}
                style={{ left: `calc(${position * 100}% * var(--track-usable))` }}
              >
                <img
                  className={styles.racerAvatar}
                  src={seller.avatarUrl ?? '/default-avatar.svg'}
                  alt=""
                  style={{ borderColor: CAR_COLORS[index % CAR_COLORS.length] }}
                />
                <Car color={CAR_COLORS[index % CAR_COLORS.length] as string} />
                {isLeader && position >= FINAL_STRETCH && (
                  <span className={styles.finalStretch}>Reta final!</span>
                )}
              </div>
            </div>

            <div className={styles.laneScore}>
              <span className={styles.scoreTotal}>{seller.total}</span>
              <span className={styles.scoreDetail}>
                {countLabel(seller.calls, 'ligação', 'ligações')} ·{' '}
                {countLabel(seller.visits, 'visita', 'visitas')}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
