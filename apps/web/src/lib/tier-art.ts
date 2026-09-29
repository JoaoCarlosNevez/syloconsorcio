// Fundo por patente — o mesmo visual no hero do Início e na capa do Perfil.
// Só Platina e Diamante têm arte; as demais usam o gradiente da patente.

import { type Tier, tierGradient } from '@sylocrm/ui'

const TIER_ART: Partial<Record<Tier, string>> = {
  platina: '/tier-bg-platina.webp',
  diamante: '/tier-bg-diamante.webp',
}

/** Valor de `background` com a arte da patente (ou o gradiente, sem arte). */
export function tierBackground(tier: Tier): string {
  const art = TIER_ART[tier]
  return art ? `url(${art}) lightgray 50% / cover no-repeat` : tierGradient(tier)
}
