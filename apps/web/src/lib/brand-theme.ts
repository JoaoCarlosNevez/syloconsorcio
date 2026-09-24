// Tema White Label — troca a cor de destaque da Sylo (âmbar, tokens
// --color-accent* em packages/ui/src/tokens/index.css) pela cor secundária da
// organização ativa. As variações (claro, borda, texto, sombra) são derivadas
// da cor base misturando com branco/preto, na mesma proporção aproximada da
// escala âmbar original.
//
// O gradiente dos botões não é "branco → cor" (fica lavado em cores
// saturadas): é análogo — a mesma cor, mais clara e com a matiz levemente
// deslocada, como o #ffeab1 → #ffa705 da Sylo. O texto por cima
// (--color-accent-contrast) é escuro ou branco conforme a luminância, e cores
// escuras ganham um clareamento menor pra o texto branco seguir legível nas
// duas pontas.

type Rgb = [number, number, number]

function hexToRgb(hex: string): Rgb | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!match) return null
  return [
    Number.parseInt(match[1] as string, 16),
    Number.parseInt(match[2] as string, 16),
    Number.parseInt(match[3] as string, 16),
  ]
}

function mix(color: Rgb, target: Rgb, amount: number): string {
  const channel = (i: 0 | 1 | 2) => Math.round(color[i] + (target[i] - color[i]) * amount)
  return `#${[channel(0), channel(1), channel(2)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

type Hsl = [number, number, number]

function rgbToHsl([r, g, b]: Rgb): Hsl {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return [h * 60, s, l]
}

function hslToHex([h, sRaw, lRaw]: Hsl): string {
  const s = Math.min(Math.max(sRaw, 0), 1)
  const l = Math.min(Math.max(lRaw, 0), 1)
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number) => {
    const k = (n + h / 30) % 12
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}

/** Luminância relativa (WCAG). */
function luminance([r, g, b]: Rgb): number {
  const linear = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

const DARK_TEXT = '#0b1c30'
const LIGHT_TEXT = '#ffffff'

function deriveGradient(rgb: Rgb, hex: string): Record<string, string> {
  const [h, s, l] = rgbToHsl(rgb)
  // Acima disso texto escuro contrasta melhor que branco (≈ ponto de
  // equilíbrio de contraste WCAG entre #0b1c30 e #fff).
  const isLight = luminance(rgb) > 0.3
  const shiftedHue = (h + 8) % 360

  // Cor já quase branca: não há pra onde clarear — a própria cor vira a ponta
  // clara e o gradiente escurece um pouco.
  if (l > 0.82) {
    return {
      '--color-accent-gradient-from': hex,
      '--color-accent-gradient-to': hslToHex([(h + 352) % 360, s, l - 0.14]),
      '--color-accent-contrast': DARK_TEXT,
    }
  }

  // Cores claras: clareia bastante (até 88% de luminosidade), como o âmbar.
  // Cores escuras: clareia pouco, pra o texto branco não sumir na ponta clara.
  const lift = isLight ? Math.min(0.34, 0.88 - l) : Math.min(0.14, 0.6 - l)
  const from = hslToHex([shiftedHue, Math.min(s, 0.95), l + Math.max(lift, 0.06)])
  return {
    '--color-accent-gradient-from': from,
    '--color-accent-gradient-to': hex,
    '--color-accent-contrast': isLight ? DARK_TEXT : LIGHT_TEXT,
  }
}

const WHITE: Rgb = [255, 255, 255]
const BLACK: Rgb = [0, 0, 0]

/** Tokens de destaque derivados da cor; null se o hex for inválido. */
export function deriveAccentTokens(hex: string): Record<string, string> | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  return {
    '--color-accent': hex,
    '--color-accent-subtle': mix(rgb, WHITE, 0.92),
    '--color-accent-light': mix(rgb, WHITE, 0.7),
    '--color-accent-border-badge': mix(rgb, WHITE, 0.6),
    '--color-accent-border-btn': mix(rgb, WHITE, 0.4),
    '--color-accent-link': mix(rgb, BLACK, 0.15),
    '--color-accent-badge-text': mix(rgb, BLACK, 0.3),
    '--color-accent-shadow': `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.25)`,
    ...deriveGradient(rgb, hex),
  }
}

const ACCENT_TOKEN_NAMES = Object.keys(deriveAccentTokens('#000000') ?? {})

/** Aplica a cor no :root; com null (ou hex inválido) volta pro âmbar padrão. */
export function applyBrandColor(hex: string | null): void {
  const root = document.documentElement
  const tokens = hex ? deriveAccentTokens(hex) : null
  for (const name of ACCENT_TOKEN_NAMES) {
    const value = tokens?.[name]
    if (value) root.style.setProperty(name, value)
    else root.style.removeProperty(name)
  }
}
