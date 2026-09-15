import styles from './OrganizationAvatar.module.css'

export interface OrganizationAvatarProps {
  /** Nome da organização — usado pra derivar as iniciais do fallback. */
  name: string
  /** Identificador estável — usado pra escolher a cor do fallback (sempre a mesma pra mesma organização). */
  id: string
  /** URL do ícone próprio da organização (branding.iconUrl). Quando ausente, mostra o fallback de iniciais. */
  iconUrl?: string | null
  /** Tamanho em px, só usado pra calcular o tamanho da fonte das iniciais — o tamanho da caixa vem do className do chamador. */
  size?: number
  className?: string
}

// Paleta com bom contraste pra texto branco em cima — mesma linguagem visual
// dos tiers de gamificação (turmalina/rubi/platina/diamante) mas com mais variação.
const PALETTE = [
  '#0EA5E9', // sky
  '#8B5CF6', // violet
  '#F59E0B', // amber
  '#10B981', // emerald
  '#EF4444', // red
  '#EC4899', // pink
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#F97316', // orange
  '#84CC16', // lime
]

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const FALLBACK_COLOR = '#64748b'

function colorForId(id: string): string {
  return PALETTE[hashString(id) % PALETTE.length] ?? FALLBACK_COLOR
}

/** "Realize Representações" → "RR", "João Carlos" → "JC", "Sylo" → "S". */
function initialsForName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return (words[0]?.[0] ?? '?').toUpperCase()
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase()
}

/**
 * Ícone de organização: mostra branding.iconUrl quando existe, ou um
 * fallback estilo Google/Slack com as iniciais do nome sobre uma cor
 * determinística (mesma organização sempre cai na mesma cor).
 *
 * O tamanho/borda/raio da caixa vêm do className do chamador (mesmo
 * contrato de um <img> normal) — este componente só decide o conteúdo.
 */
export function OrganizationAvatar({
  name,
  id,
  iconUrl,
  size = 32,
  className,
}: OrganizationAvatarProps) {
  const rootClassName = [styles.root, className].filter(Boolean).join(' ')
  // Tamanho sempre via inline style — className só contribui borda/raio/fundo,
  // nunca dimensão, pra não depender da ordem de carregamento dos CSS Modules.
  const boxSize = { width: size, height: size }

  if (iconUrl) {
    return (
      <span className={rootClassName} style={boxSize}>
        <img src={iconUrl} alt="" className={styles.img} />
      </span>
    )
  }

  return (
    <span
      className={rootClassName}
      style={{ ...boxSize, background: colorForId(id) }}
      role="img"
      aria-label={name}
    >
      <span className={styles.initials} style={{ fontSize: size * 0.4 }}>
        {initialsForName(name)}
      </span>
    </span>
  )
}
