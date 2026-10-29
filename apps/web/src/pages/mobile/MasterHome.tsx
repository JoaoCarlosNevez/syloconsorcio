// Início do Master no celular: os totais da rede e o comparativo das
// Representações. Tocar numa Representação entra nela como Dono (o app vira o
// Painel dela); o "voltar pra rede" fica no topo do Painel.

import { Skeleton } from '@sylocrm/ui'
import { useState } from 'react'
import { useMasterDashboardQuery } from '../../hooks/useDashboard'
import { useActiveOrganization } from '../../hooks/useOrganization'
import type { ManagementPeriod } from '../../lib/dashboard-api'
import { formatMoney } from '../../lib/mobile'
import { formatPercent } from '../../lib/mobile-profile'
import { GoalBar, HomeHeader, Stat, StatGrid } from './HomeParts'
import styles from './Mobile.module.css'
import { useNow } from './MobileUi'
import { PushCard } from './PushCard'

const PERIODS: { key: ManagementPeriod; label: string }[] = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'last_month', label: 'Mês anterior' },
]

export function MasterHome() {
  const now = useNow(30_000)
  const [period, setPeriod] = useState<ManagementPeriod>('month')
  const { organizationId, membership, memberships, setActiveOrganizationId } =
    useActiveOrganization()
  const { data, isLoading, isError, refetch } = useMasterDashboardQuery(organizationId, period)

  // Só dá pra entrar nas Representações que o backend liberou como Dono.
  const canEnter = (id: string) => memberships.some((m) => m.organizationId === id)

  return (
    <main className={styles.content}>
      <HomeHeader now={now} subtitle={membership?.organizationName} />
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
          <b>Não deu pra carregar a rede</b>
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
          <Skeleton width="100%" height={260} />
        </>
      ) : data.representations.length === 0 ? (
        <p className={styles.empty}>
          Nenhuma representação ligada a este Master ainda. Assim que a Sylo ligar as representações
          da sua rede, o comparativo aparece aqui.
        </p>
      ) : (
        <>
          <section className={`${styles.card} ${styles.goalCard}`}>
            <span className={styles.statLabel}>Vendido na rede</span>
            <div className={styles.goalHead}>
              <strong>{formatMoney(data.totals.wonValueCents)}</strong>
              <span className={styles.note}>
                {data.totals.goalCents
                  ? `${formatPercent(data.totals.goalPercent)} de ${formatMoney(data.totals.goalCents)}`
                  : 'sem meta definida'}
              </span>
            </div>
            {data.totals.goalCents ? <GoalBar percent={data.totals.goalPercent} /> : null}
          </section>

          <StatGrid>
            <Stat label="Novos leads" value={String(data.totals.newLeads)} />
            <Stat label="Conversão" value={formatPercent(data.totals.conversionPercent)} />
            <Stat
              label="Parados +7 dias"
              value={String(data.totals.staleAttention)}
              tone={data.totals.staleAttention > 0 ? 'danger' : 'default'}
            />
            <Stat
              label="Cotas atrasadas"
              value={String(data.totals.postSaleLate)}
              tone={data.totals.postSaleLate > 0 ? 'danger' : 'default'}
            />
          </StatGrid>

          <section>
            <h2 className={styles.sectionTitle}>
              Representações <small>toque pra entrar</small>
            </h2>
            <div className={`${styles.card} ${styles.list}`}>
              {data.representations.map((rep, index) => (
                <button
                  key={rep.id}
                  type="button"
                  className={styles.row}
                  disabled={!canEnter(rep.id)}
                  onClick={() => setActiveOrganizationId(rep.id)}
                >
                  <span className={styles.rank}>{index + 1}</span>
                  <div className={styles.grow}>
                    <span className={styles.rowTitle}>{rep.name}</span>
                    <div className={styles.rowSub}>
                      {rep.summary.wonCount} venda{rep.summary.wonCount === 1 ? '' : 's'} ·{' '}
                      {rep.sellersCount} vendedor{rep.sellersCount === 1 ? '' : 'es'}
                      {rep.health.staleAttention > 0
                        ? ` · ${rep.health.staleAttention} parados`
                        : ''}
                      {rep.postSale.lateCount > 0 ? ` · ${rep.postSale.lateCount} atrasadas` : ''}
                    </div>
                  </div>
                  <div className={styles.time}>
                    {formatMoney(rep.summary.wonValueCents)}
                    {rep.goalPercent !== null && (
                      <div className={styles.statCaption}>{formatPercent(rep.goalPercent)}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>
              Melhores vendedores <small>da rede</small>
            </h2>
            <div className={`${styles.card} ${styles.list}`}>
              {data.sellers.slice(0, 10).map((seller, index) => (
                <div key={`${seller.representationId}-${seller.userId}`} className={styles.row}>
                  <span className={styles.rank}>{index + 1}</span>
                  <div className={styles.grow}>
                    <span className={styles.rowTitle}>{seller.name}</span>
                    <div className={styles.rowSub}>{seller.representationName}</div>
                  </div>
                  <span className={styles.time}>{formatMoney(seller.wonValueCents)}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
