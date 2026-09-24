// Cálculos de exibição dos cards de meta do início — percentual, quanto
// falta e ritmo diário necessário até o fim do mês.

import { formatBRL } from './lead-adapters'
import type { SalesGoalProgress } from './team-api'

export interface GoalProgressView {
  hasGoal: boolean
  /** Percentual atingido, arredondado (pode passar de 100). */
  percent: number
  /** Largura da barra, limitada a 100%. */
  barPercent: number
  remainingCents: number
  reached: boolean
}

export function toGoalProgressView(progress: SalesGoalProgress): GoalProgressView {
  const { goalCents, achievedCents } = progress
  if (goalCents === null || goalCents === 0) {
    return { hasGoal: false, percent: 0, barPercent: 0, remainingCents: 0, reached: false }
  }
  const ratio = achievedCents / goalCents
  return {
    hasGoal: true,
    percent: Math.floor(ratio * 100),
    barPercent: Math.min(ratio, 1) * 100,
    remainingCents: Math.max(goalCents - achievedCents, 0),
    reached: achievedCents >= goalCents,
  }
}

/** Dias úteis (seg–sex) de hoje, inclusive, até o fim do período. */
export function businessDaysRemaining(periodEnd: string, today: Date = new Date()): number {
  const end = new Date(periodEnd)
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let count = 0
  while (day < end) {
    const weekday = day.getDay()
    if (weekday !== 0 && weekday !== 6) count++
    day.setDate(day.getDate() + 1)
  }
  return count
}

/** "R$ 1.250.000" — metas são exibidas em reais inteiros. */
export function formatGoalBRL(cents: number): string {
  return `R$ ${formatBRL(Math.round(cents / 100) * 100)}`
}

/** Máscara da meta em reais inteiros: "1500000" → "1.500.000". */
export function formatGoalInput(raw: string): string {
  const digits = raw
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, 13)
  if (!digits) return ''
  return Number(digits).toLocaleString('pt-BR')
}

export function goalInputToCents(value: string): number | null {
  const digits = value.replace(/\D/g, '')
  return digits ? Number(digits) * 100 : null
}
