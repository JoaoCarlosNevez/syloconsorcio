// FunnelChart — o funil de conversão como uma faixa contínua (SVG): cada
// etapa ocupa uma coluna e a espessura da faixa no meio dela é proporcional à
// quantidade de leads (raiz quadrada, pra uma etapa cheia não esmagar as
// outras). As transições entre etapas são curvas suaves.

import { useId } from 'react'
import styles from './ManagementHome.module.css'

const WIDTH = 1000
const HEIGHT = 240
const CENTER = HEIGHT / 2
const MIN_HALF = 7
const MAX_HALF = HEIGHT / 2 - 8

/** Meia-altura da faixa pra uma quantidade. */
export function bandHalfHeight(count: number, maxCount: number): number {
  if (maxCount <= 0 || count <= 0) return MIN_HALF
  return MIN_HALF + (MAX_HALF - MIN_HALF) * Math.sqrt(count / maxCount)
}

/** Contorno de cima (y = centro − meia-altura) passando pelo meio de cada
 * coluna, com tangente horizontal em cada ponto (curvas cúbicas). */
function edgePath(points: { x: number; half: number }[], sign: 1 | -1): string {
  const y = (half: number) => CENTER - sign * half
  const [first, ...rest] = points
  if (!first) return ''
  let d = `${first.x},${y(first.half)}`
  let prev = first
  for (const point of rest) {
    const midX = (prev.x + point.x) / 2
    d += ` C ${midX},${y(prev.half)} ${midX},${y(point.half)} ${point.x},${y(point.half)}`
    prev = point
  }
  return d
}

export function FunnelChart({ counts }: { counts: number[] }) {
  const gradientId = useId()
  const clipId = useId()
  const n = counts.length
  if (n === 0) return null
  const column = WIDTH / n
  const maxCount = Math.max(...counts)
  const centers = counts.map((count, i) => ({
    x: column * i + column / 2,
    half: bandHalfHeight(count, maxCount),
  }))
  // Começa fino na borda esquerda e termina na altura da última etapa.
  const last = centers[n - 1] as { x: number; half: number }
  const points = [{ x: 0, half: MIN_HALF }, ...centers, { x: WIDTH, half: last.half }]
  const top = edgePath(points, 1)
  const bottom = edgePath([...points].reverse(), -1)

  return (
    <svg
      className={styles.funnelSvg}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Funil: ${counts.join(', ')} leads por etapa`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#ffeab1" />
          <stop offset="55%" stopColor="#f5b342" />
          <stop offset="100%" stopColor="#b8651c" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={`M ${top} L ${bottom} Z`} />
        </clipPath>
      </defs>
      <path d={`M ${top} L ${bottom} Z`} fill={`url(#${gradientId})`} />
      {/* Divisórias só dentro da faixa. */}
      <g clipPath={`url(#${clipId})`}>
        {counts.slice(1).map((_, i) => (
          <line
            // biome-ignore lint/suspicious/noArrayIndexKey: divisórias fixas por posição
            key={i}
            x1={column * (i + 1)}
            x2={column * (i + 1)}
            y1={0}
            y2={HEIGHT}
            className={styles.funnelDivider}
          />
        ))}
      </g>
    </svg>
  )
}
