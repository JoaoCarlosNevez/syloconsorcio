// MemberTier — patente (nível de gamificação) do membro numa organização.
//
// Definida pelo gestor em Configurações → Equipe, pertence à Membership (o
// mesmo usuário pode ter patentes diferentes em organizações diferentes).
// A ordem abaixo é a da progressão: Bronze é o nível inicial, Diamante o topo.

export const MemberTier = {
  BRONZE: 'bronze',
  PRATA: 'prata',
  OURO: 'ouro',
  PLATINA: 'platina',
  DIAMANTE: 'diamante',
} as const

export type MemberTier = (typeof MemberTier)[keyof typeof MemberTier]

/** Todas as patentes, da mais baixa pra mais alta. */
export const MEMBER_TIERS: readonly MemberTier[] = Object.values(MemberTier)

/** Patente de quem acabou de entrar na organização. */
export const DEFAULT_MEMBER_TIER: MemberTier = MemberTier.BRONZE
