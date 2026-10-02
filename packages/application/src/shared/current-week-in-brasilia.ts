// Semana corrente (segunda a domingo) no fuso de Brasília, como intervalo
// [start, end) em UTC — base do ranking "da semana".

// Brasília é UTC-3 fixo desde o fim do horário de verão (2019).
const BRASILIA_UTC_OFFSET_HOURS = 3

export function currentWeekInBrasilia(now: Date): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now)
  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value) - 1
  const day = Number(parts.find((p) => p.type === 'day')?.value)
  // getUTCDay da data civil de Brasília: 0 = domingo → recua até segunda.
  const weekday = new Date(Date.UTC(year, month, day)).getUTCDay()
  const mondayDay = day - ((weekday + 6) % 7)
  return {
    start: new Date(Date.UTC(year, month, mondayDay, BRASILIA_UTC_OFFSET_HOURS)),
    end: new Date(Date.UTC(year, month, mondayDay + 7, BRASILIA_UTC_OFFSET_HOURS)),
  }
}
