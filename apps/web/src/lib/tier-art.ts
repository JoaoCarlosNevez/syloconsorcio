// Patente na tela: quem tem (só Vendedor) e o fundo/anel por patente — o mesmo
// visual no hero do Início, na capa do Perfil e na sidebar. Só Platina e
// Diamante têm arte; as demais usam o gradiente da patente. Sem patente (Dono
// e Supervisor), fica um fundo neutro.

import { type Tier, tierGradient } from '@sylocrm/ui'

const TIER_ART: Partial<Record<Tier, string>> = {
  platina: '/tier-bg-platina.webp',
  diamante: '/tier-bg-diamante.webp',
}

const NEUTRAL_GRADIENT = 'linear-gradient(135deg, #e2e8f0, #94a3b8)'

/** A patente do membro, ou null quando o papel não tem patente — só o
 * Vendedor tem (espelha roleHasTier do domínio). */
export function visibleTier(member: {
  role: 'ADMIN' | 'MANAGER' | 'SELLER'
  tier: Tier
}): Tier | null {
  return member.role === 'SELLER' ? member.tier : null
}

/** Valor de `background` com a arte da patente (ou o gradiente, sem arte). */
export function tierBackground(tier: Tier | null): string {
  if (!tier) return NEUTRAL_GRADIENT
  const art = TIER_ART[tier]
  return art ? `url(${art}) lightgray 50% / cover no-repeat` : tierGradient(tier)
}

/** Gradiente do anel ao redor da foto. */
export function tierRingGradient(tier: Tier | null): string {
  return tier ? tierGradient(tier) : NEUTRAL_GRADIENT
}
