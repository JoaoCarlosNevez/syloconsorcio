// Meus leads no celular: busca por nome/telefone e filtro por etapa do funil
// Comercial. O Kanban de arrastar fica no computador.

import { Skeleton } from '@sylocrm/ui'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFunnelsQuery } from '../../hooks/useFunnels'
import { useLeadsQuery } from '../../hooks/useLeads'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { formatMoney } from '../../lib/mobile'
import styles from './Mobile.module.css'
import { PlusIcon, SearchIcon } from './icons'

function useDebounced(value: string, delayMs = 300): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

export function MobileLeadsPage() {
  const { organizationId } = useActiveOrganization()
  const funnels = useFunnelsQuery(organizationId)
  const commercial = useMemo(
    () => funnels.data?.funnels.find((funnel) => funnel.kind === 'COMMERCIAL') ?? null,
    [funnels.data],
  )
  const [stageId, setStageId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const search = useDebounced(query.trim())

  const leads = useLeadsQuery(commercial ? organizationId : null, {
    funnelId: commercial?.id,
    stageId: stageId ?? undefined,
    search: search || undefined,
    outcome: 'aberto',
    pageSize: 50,
  })
  const stageName = (id: string) => commercial?.stages.find((s) => s.id === id)?.name ?? ''

  return (
    <>
      <main className={styles.content}>
        <div className={styles.top}>
          <h1 className={styles.title}>Meus leads</h1>
        </div>
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
            onClick={() => setStageId(null)}
          >
            Todos
          </button>
          {commercial?.stages.map((stage) => (
            <button
              key={stage.id}
              type="button"
              className={`${styles.chip} ${stageId === stage.id ? styles.chipOn : ''}`}
              onClick={() => setStageId(stage.id)}
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
                    {lead.segment} · {formatMoney(lead.valueCents)}
                  </div>
                </div>
                <span className={styles.pill}>{stageName(lead.stageId)}</span>
              </Link>
            ))
          )}
        </div>
        {(leads.data?.total ?? 0) > (leads.data?.items.length ?? 0) && (
          <p className={styles.note}>
            Mostrando {leads.data?.items.length} de {leads.data?.total}. Use a busca pra achar os
            outros.
          </p>
        )}
      </main>
      <Link to="/m/leads/novo" className={styles.fab} aria-label="Novo lead">
        <PlusIcon />
      </Link>
    </>
  )
}
