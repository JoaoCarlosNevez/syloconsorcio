// Perfil do app do celular (/m) — decide as abas e o início de cada um a
// partir da membership ativa (tipo da organização + permissions, nunca só o
// role, igual ao backend):
//
//   master   organização MASTER (network.read): Rede + Avisos
//   gestao   Dono/Supervisor (reports.read): Painel, Leads, Tarefas, Avisos
//   adm      Administrativo (backoffice): ADM/Pós-venda, Funis, Tarefas, Avisos
//   vendedor o resto: Hoje, Leads, Tarefas, Avisos

import type { MembershipSummary } from '../hooks/useOrganization'

export type MobileProfile = 'master' | 'gestao' | 'adm' | 'vendedor'

export function mobileProfile(
  membership: Pick<MembershipSummary, 'organizationType' | 'role' | 'permissions'> | null,
): MobileProfile {
  if (!membership) return 'vendedor'
  if (membership.organizationType === 'MASTER' || membership.permissions.includes('network.read')) {
    return 'master'
  }
  if (membership.permissions.includes('reports.read')) return 'gestao'
  if (membership.role === 'BACKOFFICE') return 'adm'
  return 'vendedor'
}

/** Pode trocar o responsável do lead (Dono, Supervisor, ADM). */
export function canAssignLeads(membership: Pick<MembershipSummary, 'permissions'> | null): boolean {
  return membership?.permissions.includes('lead.assign') ?? false
}

export type MobileTabKey = 'inicio' | 'leads' | 'tarefas' | 'avisos'

export interface MobileTab {
  key: MobileTabKey
  to: string
  label: string
}

const TABS: Record<MobileProfile, MobileTab[]> = {
  vendedor: [
    { key: 'inicio', to: '/m', label: 'Hoje' },
    { key: 'leads', to: '/m/leads', label: 'Leads' },
    { key: 'tarefas', to: '/m/tarefas', label: 'Tarefas' },
    { key: 'avisos', to: '/m/avisos', label: 'Avisos' },
  ],
  gestao: [
    { key: 'inicio', to: '/m', label: 'Painel' },
    { key: 'leads', to: '/m/leads', label: 'Leads' },
    { key: 'tarefas', to: '/m/tarefas', label: 'Tarefas' },
    { key: 'avisos', to: '/m/avisos', label: 'Avisos' },
  ],
  adm: [
    { key: 'inicio', to: '/m', label: 'Hoje' },
    { key: 'leads', to: '/m/leads', label: 'Funis' },
    { key: 'tarefas', to: '/m/tarefas', label: 'Tarefas' },
    { key: 'avisos', to: '/m/avisos', label: 'Avisos' },
  ],
  master: [
    { key: 'inicio', to: '/m', label: 'Rede' },
    { key: 'avisos', to: '/m/avisos', label: 'Avisos' },
  ],
}

export function mobileTabs(profile: MobileProfile): MobileTab[] {
  return TABS[profile]
}

/** Dias inteiros desde `iso` (0 = hoje). */
export function daysSince(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000))
}

/** Percentual com no máximo uma casa ("—" sem valor). */
export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}
