// ManagementHome — início do Dono e do Supervisor (quem tem reports.read):
// resumo do período, saúde do pipeline, funil de conversão e o funil ADM do
// pós-venda. As contas ficam na API (GetManagementDashboardUseCase); aqui só
// apresentação. O Vendedor continua com o início dele (SellerHome).

import { Skeleton } from '@sylocrm/ui'
import { type ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { useManagementDashboardQuery } from '../../hooks/useDashboard'
import { useActiveOrganization } from '../../hooks/useOrganization'
import type { ManagementDashboard, ManagementPeriod } from '../../lib/dashboard-api'
import { FunnelChart } from './FunnelChart'
import styles from './ManagementHome.module.css'

const PERIODS: { key: ManagementPeriod; label: string }[] = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'last_month', label: 'Mês anterior' },
]

const PERIOD_NOUN: Record<ManagementPeriod, string> = {
  week: 'na semana',
  month: 'no mês',
  last_month: 'no mês anterior',
}

// ── Formatação ───────────────────────────────────────────────────────────────

function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

/** "R$ 1,2 mi" / "R$ 350 mil" — pra caber nos cards. */
function formatMoneyShort(cents: number): string {
  const reais = cents / 100
  if (reais >= 1_000_000) {
    return `R$ ${(reais / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  }
  if (reais >= 10_000) {
    return `R$ ${Math.round(reais / 1000).toLocaleString('pt-BR')} mil`
  }
  return formatMoney(cents)
}

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

function formatDays(value: number | null): string {
  if (value === null) return '—'
  if (value < 1) return 'menos de 1d'
  return `${Math.round(value)}d`
}

function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString('pt-BR')} ${count === 1 ? one : many}`
}

// ── Ícones ───────────────────────────────────────────────────────────────────

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const TargetIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </Icon>
)
const UsersIcon = () => (
  <Icon>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
)
const TrendIcon = () => (
  <Icon>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </Icon>
)
const TrophyIcon = () => (
  <Icon>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </Icon>
)
const UserOffIcon = () => (
  <Icon>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="17" y1="8" x2="22" y2="13" />
    <line x1="22" y1="8" x2="17" y2="13" />
  </Icon>
)
const ClockIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 14" />
  </Icon>
)
const AlertIcon = () => (
  <Icon>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </Icon>
)
const QueueIcon = () => (
  <Icon>
    <path d="M3 6h18M3 12h18M3 18h12" />
  </Icon>
)

// ── Peças ────────────────────────────────────────────────────────────────────

type CardTone = 'default' | 'gold' | 'danger'

function StatCard({
  label,
  value,
  caption,
  icon,
  tone = 'default',
  children,
}: {
  label: string
  value: string
  caption: string
  icon: ReactNode
  tone?: CardTone
  children?: ReactNode
}) {
  const toneClass = tone === 'gold' ? styles.cardGold : tone === 'danger' ? styles.cardDanger : ''
  return (
    <div className={`${styles.card} ${toneClass}`}>
      <div className={styles.cardHeader}>
        <span className={styles.cardLabel}>{label}</span>
        <span className={styles.cardIcon}>{icon}</span>
      </div>
      <span className={styles.cardValue}>{value}</span>
      <span className={styles.cardCaption}>{caption}</span>
      {children}
    </div>
  )
}

function SalesCard({ data }: { data: ManagementDashboard }) {
  const { wonValueCents, wonCount, goalCents, projectedCents, avgTicketCents } = data.summary
  const goalPercent = goalCents ? Math.min(100, (wonValueCents / goalCents) * 100) : null
  return (
    <StatCard
      label="Vendas"
      value={formatMoneyShort(wonValueCents)}
      caption={`${plural(wonCount, 'venda', 'vendas')} ${PERIOD_NOUN[data.period]}${
        avgTicketCents ? ` · tíquete ${formatMoneyShort(avgTicketCents)}` : ''
      }`}
      icon={<TrophyIcon />}
      tone="gold"
    >
      {goalCents && data.period !== 'week' ? (
        <div className={styles.goal}>
          <div className={styles.goalTrack}>
            <div className={styles.goalFill} style={{ width: `${goalPercent ?? 0}%` }} />
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

function SalesFunnelCard({
  data,
  onSelectFunnel,
}: {
  data: ManagementDashboard
  onSelectFunnel: (id: string) => void
}) {
  const funnel = data.salesFunnel
  if (!funnel) return null
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Funil de Conversão</h2>
        {data.salesFunnels.length > 1 && (
          <select
            className={styles.select}
            value={funnel.id}
            onChange={(e) => onSelectFunnel(e.target.value)}
            aria-label="Funil"
          >
            {data.salesFunnels.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className={styles.stageScroller}>
        <div
          className={styles.stageGrid}
          style={{ gridTemplateColumns: `repeat(${funnel.stages.length}, minmax(150px, 1fr))` }}
        >
          {funnel.stages.map((stage) => (
            <div key={stage.id} className={styles.stageCol}>
              <span className={styles.stageName}>
                <span className={styles.stageDot} style={{ background: stage.color }} />
                {stage.name}
              </span>
              <span className={styles.stageCount}>{stage.count.toLocaleString('pt-BR')}</span>
              <dl className={styles.stageStats}>
                <dt>Valor</dt>
                <dd>{stage.valueCents ? formatMoneyShort(stage.valueCents) : '—'}</dd>
                <dt>Tempo médio</dt>
                <dd>{formatDays(stage.avgDaysInStage)}</dd>
                <dt>Conversão</dt>
                <dd style={{ color: stage.color }}>{formatPercent(stage.conversionPercent)}</dd>
              </dl>
            </div>
          ))}

          <div className={styles.chartRow} style={{ gridColumn: '1 / -1' }}>
            <FunnelChart counts={funnel.stages.map((s) => s.count)} />
            <div
              className={styles.chartLabels}
              style={{ gridTemplateColumns: `repeat(${funnel.stages.length}, 1fr)` }}
            >
              {funnel.stages.map((stage) => (
                <span key={stage.id}>{stage.count}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className={styles.panelFootnote}>
        {plural(funnel.wonCount, 'lead ganho', 'leads ganhos')} neste funil desde o início ·
        conversão = quantos dos que chegaram na etapa seguiram adiante (a última, em Ganho) · tempo
        médio = há quanto tempo os leads de hoje estão na etapa
      </p>
    </section>
  )
}

function BackofficeCard({ data }: { data: ManagementDashboard }) {
  const navigate = useNavigate()
  const adm = data.backoffice
  if (!adm) return null
  const total = adm.stages.reduce((sum, stage) => sum + stage.count, 0)
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Funil ADM · pós-venda</h2>
        {adm.staleCount > 0 ? (
          <span className={styles.badgeDanger}>
            {plural(adm.staleCount, 'card parado', 'cards parados')} há mais de 2 dias
          </span>
        ) : (
          total > 0 && <span className={styles.badgeOk}>Tudo andando</span>
        )}
      </div>

      <div className={styles.admStages}>
        {adm.stages.map((stage) => (
          <div key={stage.id} className={styles.admStage}>
            <span className={styles.admStageBar} style={{ background: stage.color }} />
            <span className={styles.stageName}>{stage.name}</span>
            <span className={styles.stageCount}>{stage.count}</span>
            <span className={styles.admStageMeta}>
              {stage.count === 0
                ? 'vazio'
                : `média ${formatDays(stage.avgDaysInStage)}${
                    stage.staleCount ? ` · ${stage.staleCount} parado(s)` : ''
                  }`}
            </span>
          </div>
        ))}
      </div>

      <h3 className={styles.subTitle}>Há mais tempo na mesma etapa</h3>
      {adm.oldest.length === 0 ? (
        <p className={styles.empty}>
          Nenhuma venda no pós-venda agora. Todo lead ganho num funil de vendas aparece aqui.
        </p>
      ) : (
        <ul className={styles.oldestList}>
          {adm.oldest.map((card) => (
            <li key={card.leadId}>
              <button
                type="button"
                className={styles.oldestRow}
                onClick={() =>
                  navigate('/app/kanban', { state: { openLeadId: card.leadId, funnelId: adm.id } })
                }
              >
                <span className={styles.oldestName}>{card.name}</span>
                <span className={styles.oldestStage}>{card.stageName}</span>
                <span className={styles.oldestSeller}>{card.sellerName ?? 'Sem vendedor'}</span>
                <span className={card.daysInStage > 2 ? styles.oldestDaysLate : styles.oldestDays}>
                  {card.daysInStage === 0 ? 'hoje' : plural(card.daysInStage, 'dia', 'dias')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DashboardSkeleton() {
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
      <Skeleton variant="rect" width="100%" height="420px" style={{ borderRadius: 16 }} />
    </>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────

export function ManagementHome() {
  const { organizationId, membership } = useActiveOrganization()
  const [period, setPeriod] = useState<ManagementPeriod>('month')
  const [funnelId, setFunnelId] = useState<string | null>(null)
  const { data, isLoading, isError, error, refetch } = useManagementDashboardQuery(
    organizationId,
    period,
    funnelId,
  )

  return (
    <AppLayout>
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Visão da representação</h1>
            <p className={styles.subtitle}>{membership?.organizationName}</p>
          </div>
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
          <DashboardSkeleton />
        ) : (
          <>
            <div className={styles.cardGrid}>
              <StatCard
                label="Leads em aberto"
                value={data.summary.openLeads.toLocaleString('pt-BR')}
                caption="No pipeline de vendas"
                icon={<TargetIcon />}
              />
              <StatCard
                label="Novos leads"
                value={data.summary.newLeads.toLocaleString('pt-BR')}
                caption={`Entraram ${PERIOD_NOUN[period]}`}
                icon={<UsersIcon />}
              />
              <StatCard
                label="Taxa de conversão"
                value={formatPercent(data.summary.conversionPercent)}
                caption={`Dos novos leads ${PERIOD_NOUN[period]}, já ganhos`}
                icon={<TrendIcon />}
              />
              <SalesCard data={data} />
            </div>

            <h2 className={styles.sectionTitle}>Saúde do Pipeline</h2>
            <div className={styles.cardGrid}>
              <StatCard
                label="Sem vendedor"
                value={String(data.health.unassigned)}
                caption="Leads em aberto sem responsável"
                icon={<UserOffIcon />}
                tone={data.health.unassigned > 0 ? 'gold' : 'default'}
              />
              <StatCard
                label="Parados +7 dias"
                value={String(data.health.staleAttention)}
                caption="Atenção necessária"
                icon={<ClockIcon />}
                tone={data.health.staleAttention > 0 ? 'danger' : 'default'}
              />
              <StatCard
                label="Parados +14 dias"
                value={String(data.health.staleRisk)}
                caption="Risco de perda"
                icon={<AlertIcon />}
                tone={data.health.staleRisk > 0 ? 'danger' : 'default'}
              />
              <StatCard
                label="Fila pendente"
                value={String(data.health.pendingQueue)}
                caption="Aguardando um vendedor aceitar"
                icon={<QueueIcon />}
              />
            </div>

            <SalesFunnelCard data={data} onSelectFunnel={setFunnelId} />
            <BackofficeCard data={data} />

            <section className={`${styles.panel} ${styles.panelSoon}`}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Pós-venda · inadimplência</h2>
                <span className={styles.badgeSoon}>Em breve</span>
              </div>
              <p className={styles.empty}>
                Cotas ativas, parcelas em dia e atrasadas e risco de estorno aparecem aqui quando o
                acompanhamento das cotas entrar no CRM.
              </p>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  )
}
