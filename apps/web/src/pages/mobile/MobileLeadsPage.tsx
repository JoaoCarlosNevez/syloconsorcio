// Leads no celular: busca por nome/telefone e filtro por etapa. O Vendedor vê
// os dele no funil Comercial; Dono, Supervisor e ADM trocam de funil
// (Comercial, ADM, Pós-venda) e filtram por vendedor. O filtro fica na URL
// (?funil=adm&etapa=...&vendedor=...) — é assim que os painéis abrem a lista
// já filtrada. O Kanban de arrastar fica no computador.

import { Skeleton } from '@sylocrm/ui'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useFunnelsQuery } from '../../hooks/useFunnels'
import { useLeadsQuery } from '../../hooks/useLeads'
import { useMobileProfile } from '../../hooks/useMobileProfile'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useTeamMembersQuery } from '../../hooks/useTeam'
import type { FunnelKind } from '../../lib/funnels-api'
import { formatMoney } from '../../lib/mobile'
import { daysSince } from '../../lib/mobile-profile'
import styles from './Mobile.module.css'
import { PlusIcon, SearchIcon } from './icons'

type FunnelParam = 'comercial' | 'adm' | 'pos'

const FUNNEL_KIND: Record<FunnelParam, FunnelKind> = {
  comercial: 'COMMERCIAL',
  adm: 'BACKOFFICE',
  pos: 'POST_SALE',
}

const FUNNEL_LABEL: Record<FunnelParam, string> = {
  comercial: 'Comercial',
  adm: 'ADM',
  pos: 'Pós-venda',
}

function useDebounced(value: string, delayMs = 300): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

function isFunnelParam(value: string | null): value is FunnelParam {
  return value === 'comercial' || value === 'adm' || value === 'pos'
}

export function MobileLeadsPage() {
  const { organizationId } = useActiveOrganization()
  const { profile, canAssign } = useMobileProfile()
  const [params, setParams] = useSearchParams()
  const funnels = useFunnelsQuery(organizationId)
  const team = useTeamMembersQuery(canAssign ? organizationId : null)

  const rawFunnel = params.get('funil')
  const funnelParam: FunnelParam =
    canAssign && isFunnelParam(rawFunnel) ? rawFunnel : profile === 'adm' ? 'adm' : 'comercial'
  const stageId = params.get('etapa')
  const sellerId = canAssign ? params.get('vendedor') : null

  const funnel = useMemo(
    () => funnels.data?.funnels.find((f) => f.kind === FUNNEL_KIND[funnelParam]) ?? null,
    [funnels.data, funnelParam],
  )
  const [query, setQuery] = useState('')
  const search = useDebounced(query.trim())

  const leads = useLeadsQuery(funnel ? organizationId : null, {
    funnelId: funnel?.id,
    stageId: stageId ?? undefined,
    assignedTo: sellerId ?? undefined,
    search: search || undefined,
    outcome: 'aberto',
    pageSize: 50,
  })

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    // Trocar de funil zera a etapa (ela é de outro funil).
    if (key === 'funil') next.delete('etapa')
    setParams(next, { replace: true })
  }

  const stageName = (id: string) => funnel?.stages.find((s) => s.id === id)?.name ?? ''
  const memberName = (userId: string | null) =>
    userId ? (team.data?.members.find((m) => m.userId === userId)?.name ?? '') : 'Sem responsável'
  const sellers = (team.data?.members ?? []).filter(
    (m) => m.status === 'ACTIVE' && (m.role === 'SELLER' || m.role === 'MANAGER'),
  )
  const now = new Date()
  const isCommercial = funnelParam === 'comercial'

  return (
    <>
      <main className={styles.content}>
        <div className={styles.top}>
          <h1 className={styles.title}>
            {canAssign ? 'Leads' : 'Meus leads'}
            {canAssign && !isCommercial ? ` · ${FUNNEL_LABEL[funnelParam]}` : ''}
          </h1>
        </div>

        {canAssign && (
          <div className={styles.two}>
            <select
              className={styles.select}
              value={funnelParam}
              onChange={(e) => setParam('funil', e.target.value)}
              aria-label="Funil"
            >
              {(Object.keys(FUNNEL_LABEL) as FunnelParam[]).map((key) => (
                <option key={key} value={key}>
                  {FUNNEL_LABEL[key]}
                </option>
              ))}
            </select>
            <select
              className={styles.select}
              value={sellerId ?? ''}
              onChange={(e) => setParam('vendedor', e.target.value || null)}
              aria-label="Vendedor"
            >
              <option value="">Todos os vendedores</option>
              {sellers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name ?? m.email}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.search}>
          <SearchIcon />
          <input
            className={styles.input}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome ou telefone"
            aria-label="Buscar lead"
          />
        </div>
        <div className={styles.chips}>
          <button
            type="button"
            className={`${styles.chip} ${stageId === null ? styles.chipOn : ''}`}
            onClick={() => setParam('etapa', null)}
          >
            Todas
          </button>
          {funnel?.stages.map((stage) => (
            <button
              key={stage.id}
              type="button"
              className={`${styles.chip} ${stageId === stage.id ? styles.chipOn : ''}`}
              onClick={() => setParam('etapa', stage.id)}
            >
              {stage.name}
            </button>
          ))}
        </div>
        <div className={`${styles.card} ${styles.list}`}>
          {leads.isLoading || funnels.isLoading ? (
            [0, 1, 2, 3].map((i) => (
              <div key={i} className={styles.row}>
                <Skeleton width="100%" height={36} />
              </div>
            ))
          ) : (leads.data?.items.length ?? 0) === 0 ? (
            <p className={styles.empty}>Nenhum lead encontrado.</p>
          ) : (
            leads.data?.items.map((lead) => (
              <Link key={lead.id} to={`/m/leads/${lead.id}`} className={styles.row}>
                <div className={styles.grow}>
                  <span className={styles.rowTitle}>{lead.name}</span>
                  <div className={styles.rowSub}>
                    {canAssign
                      ? `${memberName(lead.assignedUserId)} · ${formatMoney(lead.valueCents)}`
                      : `${lead.segment} · ${formatMoney(lead.valueCents)}`}
                    {!isCommercial ? ` · ${daysSince(lead.stageChangedAt, now)}d na etapa` : ''}
                  </div>
                </div>
                <span className={styles.pill}>{stageName(lead.stageId)}</span>
              </Link>
            ))
          )}
        </div>
        {(leads.data?.total ?? 0) > (leads.data?.items.length ?? 0) && (
          <p className={styles.note}>
            Mostrando {leads.data?.items.length} de {leads.data?.total}. Use a busca ou os filtros
            pra achar os outros.
          </p>
        )}
      </main>
      {isCommercial && (
        <Link to="/m/leads/novo" className={styles.fab} aria-label="Novo lead">
          <PlusIcon />
        </Link>
      )}
    </>
  )
}
