// Mês civil corrente no fuso de Brasília, como intervalo [start, end) em UTC —
// base dos números "do mês" (metas de vendas, cards do início).

// Brasília é UTC-3 fixo desde o fim do horário de verão (2019).
const BRASILIA_UTC_OFFSET_HOURS = 3

export function currentMonthInBrasilia(now: Date): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now)
  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value) - 1
  return {
    start: new Date(Date.UTC(year, month, 1, BRASILIA_UTC_OFFSET_HOURS)),
    end: new Date(Date.UTC(year, month + 1, 1, BRASILIA_UTC_OFFSET_HOURS)),
  }
}
