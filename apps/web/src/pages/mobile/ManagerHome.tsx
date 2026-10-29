// Painel do Dono e do Supervisor no celular: vendido no mês contra a meta, o
// que precisa de atenção agora (sem responsável, parados, fila, ADM e
// pós-venda) e o ranking dos vendedores. Os números vêm do mesmo painel de
// gestão do computador (GET /dashboard/management) — o Supervisor vê só o time.

import { Skeleton } from '@sylocrm/ui'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useManagementDashboardQuery } from '../../hooks/useDashboard'
import { useMobileProfile } from '../../hooks/useMobileProfile'
import { useActiveOrganization } from '../../hooks/useOrganization'
import type { ManagementPeriod } from '../../lib/dashboard-api'
import { formatMoney } from '../../lib/mobile'
import { formatPercent } from '../../lib/mobile-profile'
import { GoalBar, HomeHeader, OfferCards, Stat, StatGrid } from './HomeParts'
import styles from './Mobile.module.css'
import { useNow } from './MobileUi'
import { PushCard } from './PushCard'

const NO_FILTERS = { sellerUserId: null, supervisorUserId: null }

const PERIODS: { key: ManagementPeriod; label: string }[] = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'last_month', label: 'Mês anterior' },
]

export function ManagerHome() {
  const now = useNow(30_000)
  const [period, setPeriod] = useState<ManagementPeriod>('month')
  const { organizationId, membership, setActiveOrganizationId } = useActiveOrganization()
  const { masterMembership } = useMobileProfile()
  const { data, isLoading, isError, refetch } = useManagementDashboardQuery(
    organizationId,
    period,
    null,
    NO_FILTERS,
  )

  const sellers = [...(data?.sellers ?? [])].sort((a, b) => b.wonValueCents - a.wonValueCents)
  const goalPercent =
    data?.summary.goalCents && data.summary.goalCents > 0
      ? (data.summary.wonValueCents / data.summary.goalCents) * 100
      : null

  return (
    <main className={styles.content}>
      <HomeHeader now={now} subtitle={data?.scope.label ?? membership?.organizationName} />

      {masterMembership && masterMembership.organizationId !== organizationId && (
        <button
          type="button"
          className={`${styles.btn} ${styles.btnLine}`}
          onClick={() => setActiveOrganizationId(masterMembership.organizationId)}
        >
          ← Voltar pra rede ({masterMembership.organizationName})
        </button>
      )}

      <OfferCards now={now} />
      <PushCard hideWhenOn />

      <div className={styles.chips}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`${styles.chip} ${period === p.key ? styles.chipOn : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isError ? (
        <div className={`${styles.card} ${styles.pushCard}`}>
          <b>Não deu pra carregar o painel</b>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnLine}`}
            onClick={() => refetch()}
          >
            Tentar de novo
          </button>
        </div>
      ) : isLoading || !data ? (
        <>
          <Skeleton width="100%" height={96} />
          <Skeleton width="100%" height={150} />
          <Skeleton width="100%" height={220} />
        </>
      ) : (
        <>
          <section className={`${styles.card} ${styles.goalCard}`}>
            <span className={styles.statLabel}>Vendido</span>
            <div className={styles.goalHead}>
              <strong>{formatMoney(data.summary.wonValueCents)}</strong>
              <span className={styles.note}>
                {data.summary.goalCents
                  ? `${formatPercent(goalPercent)} de ${formatMoney(data.summary.goalCents)}`
                  : 'sem meta definida'}
              </span>
            </div>
            {data.summary.goalCents ? <GoalBar percent={goalPercent} /> : null}
            <span className={styles.statCaption}>
              {data.summary.wonCount} venda{data.summary.wonCount === 1 ? '' : 's'}
              {data.summary.projectedCents !== null && period !== 'last_month'
                ? ` · projeção ${formatMoney(data.summary.projectedCents)}`
                : ''}
            </span>
          </section>

          <StatGrid>
            <Stat label="Novos leads" value={String(data.summary.newLeads)} />
            <Stat label="Conversão" value={formatPercent(data.summary.conversionPercent)} />
            <Stat label="Em aberto" value={String(data.summary.openLeads)} to="/m/leads" />
            <Stat
              label="Ticket médio"
              value={
                data.summary.avgTicketCents === null
                  ? '—'
                  : formatMoney(data.summary.avgTicketCents)
              }
            />
          </StatGrid>

          <section>
            <h2 className={styles.sectionTitle}>Precisa de atenção</h2>
            <StatGrid>
              <Stat
                label="Sem responsável"
                value={String(data.health.unassigned)}
                tone={data.health.unassigned > 0 ? 'danger' : 'default'}
                to="/m/leads"
              />
              <Stat
                label="Parados +7 dias"
                value={String(data.health.staleAttention)}
                tone={data.health.staleAttention > 0 ? 'danger' : 'default'}
              />
              <Stat
                label="Na fila agora"
                value={String(data.health.pendingQueue)}
                caption="esperando aceite"
              />
              <Stat
                label="ADM parados"
                value={String(data.backoffice?.staleCount ?? 0)}
                caption="+2 dias na etapa"
                tone={(data.backoffice?.staleCount ?? 0) > 0 ? 'danger' : 'default'}
              />
              {data.postSale && (
                <Stat
                  label="Cotas atrasadas"
                  value={String(data.postSale.lateCount)}
                  caption={`de ${data.postSale.activeCount} no pós-venda`}
                  tone={data.postSale.lateCount > 0 ? 'danger' : 'default'}
                />
              )}
            </StatGrid>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>
              Vendedores <small>pelo valor vendido</small>
            </h2>
            <div className={`${styles.card} ${styles.list}`}>
              {sellers.length === 0 ? (
                <p className={styles.empty}>Nenhum vendedor no período.</p>
              ) : (
                sellers.map((seller, index) => (
                  <Link
                    key={seller.userId}
                    to={`/m/leads?vendedor=${seller.userId}`}
                    className={styles.row}
                  >
                    <span className={styles.rank}>{index + 1}</span>
                    <div className={styles.grow}>
                      <span className={styles.rowTitle}>{seller.name}</span>
                      <div className={styles.rowSub}>
                        {seller.wonCount} venda{seller.wonCount === 1 ? '' : 's'} ·{' '}
                        {seller.openLeads} em aberto
                        {seller.staleLeads > 0 ? ` · ${seller.staleLeads} parados` : ''}
                      </div>
                    </div>
                    <div className={styles.time}>
                      {formatMoney(seller.wonValueCents)}
                      {seller.goalPercent !== null && (
                        <div className={styles.statCaption}>
                          {formatPercent(seller.goalPercent)}
                        </div>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
