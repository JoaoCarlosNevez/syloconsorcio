// MasterHome — início do Master (network.read): os totais da rede, o
// comparativo das Representações ligadas a ele e o ranking unificado dos
// vendedores de todas. Clicar numa Representação abre o painel do Dono dela
// (ManagementHome, só leitura). As contas ficam na API
// (GetMasterDashboardUseCase); aqui só apresentação.

import { Skeleton } from '@sylocrm/ui'
import { useState } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import { useMasterDashboardQuery } from '../../hooks/useDashboard'
import { useActiveOrganization } from '../../hooks/useOrganization'
import type {
  ManagementPeriod,
  MasterDashboard,
  RepresentationPerformance,
} from '../../lib/dashboard-api'
import {
  AlertIcon,
  ClockIcon,
  GoalCell,
  ManagementHome,
  PERIODS,
  PERIOD_NOUN,
  StatCard,
  TargetIcon,
  TrendIcon,
  TrophyIcon,
  UsersIcon,
  formatMoneyShort,
  formatPercent,
  plural,
} from './ManagementHome'
import styles from './ManagementHome.module.css'
import masterStyles from './MasterHome.module.css'

/** Vendedores mostrados antes de "Ver todos". */
const SELLERS_PREVIEW = 10

function NetworkSalesCard({ data }: { data: MasterDashboard }) {
  const { wonValueCents, wonCount, avgTicketCents, goalCents, goalPercent, projectedCents } =
    data.totals
  return (
    <StatCard
      label="Vendas da rede"
      value={formatMoneyShort(wonValueCents)}
      caption={`${plural(wonCount, 'venda', 'vendas')} ${PERIOD_NOUN[data.period]}${
        avgTicketCents ? ` · ticket ${formatMoneyShort(avgTicketCents)}` : ''
      }`}
      icon={<TrophyIcon />}
      tone="gold"
    >
      {goalCents && data.period !== 'week' ? (
        <div className={styles.goal}>
          <div className={styles.goalTrack}>
            <div
              className={styles.goalFill}
              style={{ width: `${Math.min(100, goalPercent ?? 0)}%` }}
            />
          </div>
          <span className={styles.goalText}>
            {Math.round(goalPercent ?? 0)}% da meta de {formatMoneyShort(goalCents)}
            {projectedCents !== null && ` · projeção ${formatMoneyShort(projectedCents)}`}
          </span>
        </div>
      ) : (
        projectedCents !== null && (
          <span className={styles.goalText}>
            Projeção do mês: {formatMoneyShort(projectedCents)}
          </span>
        )
      )}
    </StatCard>
  )
}

function RepresentationsTable({
  data,
  onOpen,
}: {
  data: MasterDashboard
  onOpen: (row: RepresentationPerformance) => void
}) {
  const topValue = Math.max(1, ...data.representations.map((r) => r.summary.wonValueCents))
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Comparativo das representações</h2>
        <span className={styles.muted}>Clique numa representação pra ver o painel dela</span>
      </div>
      <div className={styles.tableScroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Representação</th>
              <th className={styles.num}>Vendas</th>
              <th>Meta</th>
              <th className={styles.num}>Ticket</th>
              <th className={styles.num}>Novos leads</th>
              <th className={styles.num}>Conversão</th>
              <th className={styles.num}>Em aberto</th>
              <th className={styles.num}>Parados +7d</th>
              <th className={styles.num}>ADM parados</th>
              <th className={styles.num}>Cotas atrasadas</th>
            </tr>
          </thead>
          <tbody>
            {data.representations.map((row) => (
              <tr key={row.id} className={styles.rowClickable}>
                <td className={styles.nameCell}>
                  <button type="button" className={styles.rowButton} onClick={() => onOpen(row)}>
                    {row.name}
                    <span className={styles.cellSub}>
                      {plural(row.sellersCount, 'vendedor', 'vendedores')}
                    </span>
                  </button>
                </td>
                <td className={styles.num}>
                  <strong>{formatMoneyShort(row.summary.wonValueCents)}</strong>
                  <span className={masterStyles.shareTrack} aria-hidden="true">
                    <span
                      className={masterStyles.shareFill}
                      style={{ width: `${(row.summary.wonValueCents / topValue) * 100}%` }}
                    />
                  </span>
                  <span className={styles.cellSub}>
                    {plural(row.summary.wonCount, 'venda', 'vendas')}
                  </span>
                </td>
                <td>
                  <GoalCell
                    metrics={{ goalCents: row.summary.goalCents, goalPercent: row.goalPercent }}
                  />
                </td>
                <td className={styles.num}>
                  {row.summary.avgTicketCents ? formatMoneyShort(row.summary.avgTicketCents) : '—'}
                </td>
                <td className={styles.num}>{row.summary.newLeads}</td>
                <td className={styles.num}>{formatPercent(row.summary.conversionPercent)}</td>
                <td className={styles.num}>{row.summary.openLeads}</td>
                <AlertCell value={row.health.staleAttention} />
                <AlertCell value={row.backoffice.staleCount} />
                <AlertCell value={row.postSale.lateCount} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.panelFootnote}>
        Vendas, ticket, novos leads e conversão são do período escolhido · em aberto, parados, ADM e
        cotas atrasadas são um retrato de agora · ADM parado = há mais de 2 dias na mesma etapa
      </p>
    </section>
  )
}

function AlertCell({ value }: { value: number }) {
  return <td className={value > 0 ? `${styles.num} ${styles.numAlert}` : styles.num}>{value}</td>
}

function NetworkSellersTable({ data }: { data: MasterDashboard }) {
  const [showAll, setShowAll] = useState(false)
  if (data.sellers.length === 0) return null
  const rows = showAll ? data.sellers : data.sellers.slice(0, SELLERS_PREVIEW)
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Ranking de vendedores da rede</h2>
        <span className={styles.muted}>Todas as representações, pelo valor vendido</span>
      </div>
      <div className={styles.tableScroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.num}>#</th>
              <th>Vendedor</th>
              <th className={styles.num}>Vendas</th>
              <th className={styles.num}>Novos leads</th>
              <th className={styles.num}>Conversão</th>
              <th className={styles.num}>Em aberto</th>
              <th>Meta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.representationId}:${row.userId}`}>
                <td className={styles.num}>{index + 1}º</td>
                <td className={styles.nameCell}>
                  <span className={styles.person}>
                    <img
                      src={row.avatarUrl ?? '/default-avatar.svg'}
                      alt=""
                      className={styles.personAvatar}
                    />
                    <span>
                      {row.name}
                      <span className={styles.cellSub}>{row.representationName}</span>
                    </span>
                  </span>
                </td>
                <td className={styles.num}>
                  <strong>{formatMoneyShort(row.wonValueCents)}</strong>
                  <span className={styles.cellSub}>{plural(row.wonCount, 'venda', 'vendas')}</span>
                </td>
                <td className={styles.num}>{row.newLeads}</td>
                <td className={styles.num}>{formatPercent(row.conversionPercent)}</td>
                <td className={styles.num}>{row.openLeads}</td>
                <td>
                  <GoalCell metrics={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.sellers.length > SELLERS_PREVIEW && (
        <button
          type="button"
          className={masterStyles.showAll}
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? 'Mostrar menos' : `Ver todos os ${data.sellers.length} vendedores`}
        </button>
      )}
    </section>
  )
}

function MasterSkeleton() {
  return (
    <>
      <div className={styles.cardGrid}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            variant="rect"
            width="100%"
            height="150px"
            style={{ borderRadius: 16 }}
          />
        ))}
      </div>
      <Skeleton variant="rect" width="100%" height="320px" style={{ borderRadius: 16 }} />
      <Skeleton variant="rect" width="100%" height="420px" style={{ borderRadius: 16 }} />
    </>
  )
}

export function MasterHome() {
  const { organizationId, membership } = useActiveOrganization()
  const [period, setPeriod] = useState<ManagementPeriod>('month')
  const [opened, setOpened] = useState<{ id: string; name: string } | null>(null)
  const { data, isLoading, isError, error, refetch } = useMasterDashboardQuery(
    organizationId,
    period,
  )

  if (opened) {
    return (
      <ManagementHome
        representation={{ ...opened, onBack: () => setOpened(null) }}
        key={opened.id}
      />
    )
  }

  return (
    <AppLayout>
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Visão do Master</h1>
            <p className={styles.subtitle}>{membership?.organizationName}</p>
          </div>
          <div className={styles.headerControls}>
            <fieldset className={styles.periodToggle} aria-label="Período">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={
                    p.key === period
                      ? `${styles.periodBtn} ${styles.periodBtnActive}`
                      : styles.periodBtn
                  }
                  onClick={() => setPeriod(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </fieldset>
          </div>
        </header>

        {isError ? (
          <div className={styles.errorBox}>
            <p>
              Não foi possível carregar o painel
              {error instanceof Error ? `: ${error.message}` : '.'}
            </p>
            <button type="button" className={styles.retryBtn} onClick={() => refetch()}>
              Tentar de novo
            </button>
          </div>
        ) : isLoading || !data ? (
          <MasterSkeleton />
        ) : data.representations.length === 0 ? (
          <section className={styles.panel}>
            <p className={styles.empty}>
              Nenhuma representação ligada a este Master ainda. Assim que a Sylo ligar as
              representações da sua rede, o comparativo aparece aqui.
            </p>
          </section>
        ) : (
          <>
            <div className={styles.cardGrid}>
              <NetworkSalesCard data={data} />
              <StatCard
                label="Novos leads"
                value={data.totals.newLeads.toLocaleString('pt-BR')}
                caption={`Entraram ${PERIOD_NOUN[period]} em ${plural(
                  data.representations.length,
                  'representação',
                  'representações',
                )}`}
                icon={<UsersIcon />}
              />
              <StatCard
                label="Taxa de conversão"
                value={formatPercent(data.totals.conversionPercent)}
                caption={`Dos novos leads ${PERIOD_NOUN[period]}, já ganhos`}
                icon={<TrendIcon />}
              />
              <StatCard
                label="Leads em aberto"
                value={data.totals.openLeads.toLocaleString('pt-BR')}
                caption="No pipeline de vendas da rede"
                icon={<TargetIcon />}
              />
            </div>

            <div className={styles.cardGrid}>
              <StatCard
                label="Parados +7 dias"
                value={String(data.totals.staleAttention)}
                caption="Leads em aberto sem andar"
                icon={<ClockIcon />}
                tone={data.totals.staleAttention > 0 ? 'danger' : 'default'}
              />
              <StatCard
                label="ADM parados"
                value={String(data.totals.backofficeStale)}
                caption="Há mais de 2 dias na mesma etapa"
                icon={<ClockIcon />}
                tone={data.totals.backofficeStale > 0 ? 'danger' : 'default'}
              />
              <StatCard
                label="Cotas atrasadas"
                value={String(data.totals.postSaleLate)}
                caption="No pós-venda da rede"
                icon={<AlertIcon />}
                tone={data.totals.postSaleLate > 0 ? 'danger' : 'default'}
              />
              <StatCard
                label="Representações"
                value={String(data.representations.length)}
                caption={`${plural(data.sellers.length, 'vendedor', 'vendedores')} na rede`}
                icon={<UsersIcon />}
              />
            </div>

            <RepresentationsTable
              data={data}
              onOpen={(row) => setOpened({ id: row.id, name: row.name })}
            />
            <NetworkSellersTable data={data} />
          </>
        )}
      </div>
    </AppLayout>
  )
}
