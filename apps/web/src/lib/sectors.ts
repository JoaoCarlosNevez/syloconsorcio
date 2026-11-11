// Setores do membro (Configurações → Equipe) — espelho de MemberSector em
// @sylocrm/domain; mantenha em sincronia.

export type Sector = 'vendas' | 'adm' | 'pos_venda'

export const SECTORS: readonly Sector[] = ['vendas', 'adm', 'pos_venda']

export const SECTOR_LABEL: Record<Sector, string> = {
  vendas: 'Vendas',
  adm: 'ADM',
  pos_venda: 'Pós-venda',
}

export function isSector(value: unknown): value is Sector {
  return typeof value === 'string' && (SECTORS as readonly string[]).includes(value)
}

export function sectorLabel(value: string | null | undefined): string | null {
  return isSector(value) ? SECTOR_LABEL[value] : null
}
