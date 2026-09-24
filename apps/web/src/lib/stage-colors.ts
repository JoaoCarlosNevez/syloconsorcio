// Deriva as 4 tonalidades visuais de uma coluna do Kanban (fundo do header,
// borda, texto do título, texto do contador) a partir de UM hex salvo por
// estágio (funnel_stages.color) — substitui o COLUMN_META estático de antes,
// que tinha essas 4 cores hardcoded por coluna fixa. Mesmo princípio de
// "uma cor gera a paleta" já usado em SOURCE_COLORS (lead-adapters.ts), só
// que calculado em vez de mapeado por lista fixa.

type Rgb = [number, number, number]

function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '')
  const normalized = clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean
  const value = Number.parseInt(normalized, 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function mix(rgb: Rgb, target: Rgb, amount: number): Rgb {
  return [
    Math.round(rgb[0] + (target[0] - rgb[0]) * amount),
    Math.round(rgb[1] + (target[1] - rgb[1]) * amount),
    Math.round(rgb[2] + (target[2] - rgb[2]) * amount),
  ]
}

function toRgba([r, g, b]: Rgb, alpha: number): string {
  return `rgba(${r},${g},${b},${alpha})`
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

const WHITE: Rgb = [255, 255, 255]
const BLACK: Rgb = [0, 0, 0]

export interface StageColorPalette {
  headerBg: string
  headerBorder: string
  headerText: string
  countText: string
}

const FALLBACK_HEX = '#64748b'

export function deriveStageColors(hex: string | undefined): StageColorPalette {
  let rgb: Rgb
  try {
    rgb = hexToRgb(hex ?? FALLBACK_HEX)
  } catch {
    rgb = hexToRgb(FALLBACK_HEX)
  }

  return {
    headerBg: toRgba(mix(rgb, WHITE, 0.82), 0.7),
    headerBorder: toHex(mix(rgb, WHITE, 0.55)),
    headerText: toHex(mix(rgb, BLACK, 0.65)),
    countText: toHex(mix(rgb, BLACK, 0.35)),
  }
}
