// MemberSector — setor em que o membro atua numa organização (Configurações →
// Equipe). Um membro pode estar em mais de um setor (ex: o Administrativo que
// cuida do ADM e do Pós-venda). Usado pra mandar uma tarefa pra um setor
// inteiro (fila: quem pegar primeiro vira o responsável) e pra saber quem
// acompanha a conversa de um cliente que está no ADM ou no Pós-venda.

import { Role } from '../auth/role'

export const MemberSector = {
  VENDAS: 'vendas',
  ADM: 'adm',
  POS_VENDA: 'pos_venda',
} as const

export type MemberSector = (typeof MemberSector)[keyof typeof MemberSector]

export const MEMBER_SECTORS: readonly MemberSector[] = Object.values(MemberSector)

export const MEMBER_SECTOR_LABELS: Record<MemberSector, string> = {
  vendas: 'Vendas',
  adm: 'ADM',
  pos_venda: 'Pós-venda',
}

export function isMemberSector(value: unknown): value is MemberSector {
  return typeof value === 'string' && (MEMBER_SECTORS as readonly string[]).includes(value)
}

/** Setores de quem entra na organização, pelo papel. O gestor ajusta depois. */
export function defaultSectorsForRole(role: Role): MemberSector[] {
  if (role === Role.SELLER) return [MemberSector.VENDAS]
  if (role === Role.BACKOFFICE) return [MemberSector.ADM, MemberSector.POS_VENDA]
  return []
}
