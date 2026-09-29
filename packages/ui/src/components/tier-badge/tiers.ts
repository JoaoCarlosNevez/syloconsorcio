// Patentes da gamificação — fonte única de cores e rótulos por patente pra
// toda a UI (badge, anel do avatar, sidebar, hero do início, perfil).
// Espelha MemberTier em @sylocrm/domain, na mesma ordem: Bronze é o nível
// inicial, Diamante o topo.

export type Tier = 'bronze' | 'prata' | 'ouro' | 'platina' | 'diamante'

/** Da patente mais baixa pra mais alta. */
export const TIERS: readonly Tier[] = ['bronze', 'prata', 'ouro', 'platina', 'diamante']

export const TIER_LABELS: Record<Tier, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
  platina: 'Platina',
  diamante: 'Diamante',
}

/** Cores do gradiente (claro → escuro) e o tom sólido de destaque, usado em
 * texto, bordas e fundos translúcidos. */
export const TIER_COLORS: Record<Tier, { from: string; to: string; accent: string }> = {
  bronze: { from: '#f2c29b', to: '#9a5424', accent: '#a8612d' },
  prata: { from: '#e5e9f0', to: '#6b7686', accent: '#6b7686' },
  ouro: { from: '#ffe083', to: '#c08a00', accent: '#b07d00' },
  platina: { from: '#9ecbff', to: '#005ecc', accent: '#005ecc' }, // confirmada no Figma
  diamante: { from: '#b69eff', to: '#4b00cc', accent: '#7c3aed' },
}

/** Gradiente diagonal da patente — anel do avatar, pílulas, hero. */
export function tierGradient(tier: Tier): string {
  const { from, to } = TIER_COLORS[tier]
  return `linear-gradient(135deg, ${from}, ${to})`
}
