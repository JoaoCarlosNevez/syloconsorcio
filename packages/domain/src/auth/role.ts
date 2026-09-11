// Role — abstração de negócio que representa o papel do usuário em uma organização.
//
// Role pertence ao contexto da Membership, nunca ao User global.
// O mesmo usuário pode ter Roles diferentes em organizações diferentes.
//
// Regra: nunca usar Role como mecanismo direto de autorização.
// Autorização é verificada por Permission. Role é apenas a abstração de negócio
// que determina quais Permissions são concedidas via Membership.

export const Role = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SELLER: 'SELLER',
} as const

export type Role = (typeof Role)[keyof typeof Role]
