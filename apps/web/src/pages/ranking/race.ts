// Posição de cada vendedor na pista da corrida de ligações e visitas.
//
// O líder anda com o tempo: está no começo da pista no início do período e
// cruza a chegada no fim (domingo à noite, na semana). Os outros ficam atrás
// dele na proporção das atividades — metade do total do líder, metade do
// caminho dele. Sem nenhuma atividade, todo mundo na largada.

/** Fração do período já passada, entre 0 e 1. */
export function elapsedFraction(periodStart: string, periodEnd: string, now: number): number {
  const start = new Date(periodStart).getTime()
  const end = new Date(periodEnd).getTime()
  if (end <= start) return 1
  return Math.min(1, Math.max(0, (now - start) / (end - start)))
}

/** Posição (0 a 1) na pista de quem fez `total`, sendo `leaderTotal` o do 1º. */
export function racePosition(total: number, leaderTotal: number, elapsed: number): number {
  if (leaderTotal <= 0 || total <= 0) return 0
  return elapsed * Math.min(1, total / leaderTotal)
}

/** O líder está na reta final (chegando na linha). */
export const FINAL_STRETCH = 0.85
