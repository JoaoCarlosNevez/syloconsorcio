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

function Car({ color }: { color: string }) {
  return (
    <svg className={styles.car} width="76" height="36" viewBox="0 0 64 30" aria-hidden="true">
      <path
        d="M6 20 L10 12 Q12 9 16 9 L36 9 Q40 9 43 12 L49 17 L58 18 Q62 19 62 23 L62 24 L4 24 L4 22 Q4 20 6 20 Z"
        fill={color}
        stroke="rgba(15,23,42,0.35)"
        strokeWidth="1"
      />
      <path d="M17 11 L24 11 L24 17 L13 17 Z" fill="#e0f2fe" />
      <path d="M27 11 L36 11 Q38 11 40 13 L44 17 L27 17 Z" fill="#e0f2fe" />
      <circle cx="16" cy="24" r="5" fill="#1f2937" />
      <circle cx="16" cy="24" r="2" fill="#9ca3af" />
      <circle cx="49" cy="24" r="5" fill="#1f2937" />
      <circle cx="49" cy="24" r="2" fill="#9ca3af" />
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
