// HomePage — fiel ao design Figma.
// Seções: hero de perfil, metas pessoal + representação, tarefas, KPIs.
// Dados mock com skeleton durante carregamento.

import { Skeleton } from '@sylocrm/ui'
import type { Tier } from '@sylocrm/ui'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import {
  COLUMN_STATUS_LABEL,
  COLUMN_TAREFA_LABEL,
  INITIAL_BOARD,
  USER_TIER,
  parseCotaFields,
} from '../../data/kanban-mock'
import styles from './HomePage.module.css'

// ── Ícones ────────────────────────────────────────────────────────────────────

function TargetIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function TeamIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function TrendUpIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

// ── Tipos e mock ──────────────────────────────────────────────────────────────

interface TarefaItem {
  id: string
  cliente: string
  phone: string
  segmento: string
  cota: string
  valor: string
  tarefa: string
  status: 'Atendimento' | 'Simulação' | 'Proposta'
  daysUrgent: boolean
  daysNum: number
}

const STATUS_CLASS: Record<TarefaItem['status'], string> = {
  Atendimento: styles.statusAtendimento ?? '',
  Simulação: styles.statusSimulacao ?? '',
  Proposta: styles.statusProposta ?? '',
}

// Derivado do board do Kanban — mesmo dado, sem duplicação.
// Exibe os 3 leads com prazo mais próximo ou mais vencido (maior número de dias no funil).
const MOCK_TAREFAS: TarefaItem[] = Object.entries(INITIAL_BOARD)
  .filter(([colId]) => colId !== 'venda')
  .flatMap(([colId, cards]) =>
    cards.map((card) => {
      const { segmento, valor } = parseCotaFields(card.cota)
      const daysNum = Number.parseInt(card.days, 10) || 0
      return {
        id: card.id,
        cliente: card.name,
        phone: card.phone,
        segmento,
        cota: card.cota,
        valor,
        tarefa: COLUMN_TAREFA_LABEL[colId] ?? 'Follow-Up',
        status: (COLUMN_STATUS_LABEL[colId] ?? 'Atendimento') as TarefaItem['status'],
        daysUrgent: card.daysUrgent,
        daysNum,
      }
    }),
  )
  .sort((a, b) => b.daysNum - a.daysNum)
  .slice(0, 3)

const TIER_GRADIENT: Record<Tier, string> = {
  turmalina: 'linear-gradient(135deg, #9ef5ff, #00d9ff, #00a6cc)',
  rubi: 'linear-gradient(135deg, #ff6d70, #cc0003)',
  platina: 'linear-gradient(135deg, #9ecbff, #005ecc)',
  diamante: 'linear-gradient(135deg, #b69eff, #4b00cc)',
}

const TIER_BG: Record<Tier, string> = {
  turmalina: '/tier-bg-turmalina.webp',
  rubi: '/tier-bg-rubi.webp',
  platina: '/tier-bg-platina.webp',
  diamante: '/tier-bg-diamante.webp',
}

// ── HomePage ──────────────────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)

  // TODO: buscar nome real do perfil via API
  const displayName = 'Ennyo Café'
  const handle = '@ennyocafe'

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1500)
    return () => clearTimeout(t)
  }, [])

  return (
    <AppLayout>
      <div className={styles.page}>
        {/* ── Hero de perfil ────────────────────────────────────────────── */}
        {isLoading ? (
          <div className={styles.skeletonHero}>
            <Skeleton variant="circle" width="112px" height="112px" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Skeleton variant="text" width="160px" height="28px" />
                <Skeleton variant="rect" width="90px" height="24px" style={{ borderRadius: 99 }} />
                <Skeleton variant="text" width="80px" height="16px" />
              </div>
              <Skeleton variant="text" width="320px" height="16px" />
            </div>
            <Skeleton variant="rect" width="148px" height="40px" style={{ borderRadius: 12 }} />
          </div>
        ) : (
          <div
            className={styles.profileHero}
            style={{
              background: `linear-gradient(98deg, #FFF 51.46%, rgba(255, 255, 255, 0.00) 82.99%), url(${TIER_BG[USER_TIER]}) lightgray 50% / cover no-repeat`,
            }}
          >
            {/* Avatar + info (incluindo ações abaixo do nome) */}
            <div className={styles.profileLeft}>
              <div
                className={styles.profileAvatarRing}
                style={{ background: TIER_GRADIENT[USER_TIER] }}
              >
                <div className={styles.profileAvatarInner}>
                  <img
                    src="/sara-profile.png"
                    alt={displayName}
                    className={styles.profileAvatarImg}
                  />
                </div>
              </div>

              <div className={styles.profileInfo}>
                <div className={styles.profileNameRow}>
                  <h1 className={styles.profileName}>{displayName}</h1>
                  <span
                    className={styles.tierPill}
                    style={{ background: TIER_GRADIENT[USER_TIER] }}
                  >
                    {USER_TIER.charAt(0).toUpperCase() + USER_TIER.slice(1)}
                  </span>
                  <span className={styles.profileHandle}>{handle}</span>
                </div>
                <p className={styles.profileMeta}>Equipe de Porthis, São Paulo</p>
                <div className={styles.heroActions}>
                  <button type="button" className={styles.notifBtn} aria-label="Notificações">
                    <BellIcon />
                  </button>
                  <button type="button" className={styles.chamaSaraBtn}>
                    <img
                      src="/sara-ia.png"
                      alt=""
                      aria-hidden="true"
                      className={styles.chamaSaraBtnAvatar}
                    />
                    Chamar Sara IA
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Conteúdo ──────────────────────────────────────────────────── */}
        <div className={styles.content}>
          {/* ── Cards de meta ───────────────────────────────────────────── */}
          {isLoading ? (
            <div className={styles.skeletonMetasRow}>
              {[0, 1].map((i) => (
                <div key={i} className={styles.skeletonMetaCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <Skeleton variant="circle" width="34px" height="34px" />
                      <Skeleton variant="text" width="140px" height="16px" />
                    </div>
                    <Skeleton variant="text" width="48px" height="28px" />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Skeleton variant="text" width="40%" height="36px" />
                    <Skeleton variant="text" width="30%" height="20px" />
                  </div>
                  <Skeleton variant="rect" width="100%" height="6px" style={{ borderRadius: 99 }} />
                  <Skeleton variant="text" width="60%" height="14px" />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.metasRow}>
              {/* Meta Pessoal do Mês */}
              <div className={styles.metaCard}>
                <div className={styles.metaCardBgLogo} aria-hidden="true">
                  <img src="/sylo-3d-logo.png" alt="" />
                </div>

                <div>
                  <div className={styles.metaCardTopRow}>
                    <div className={styles.metaCardTitleWrap}>
                      <div className={styles.metaCardIconWrap}>
                        <TargetIcon />
                      </div>
                      <p className={styles.metaCardTitle}>Meta Pessoal do Mês</p>
                    </div>
                    <span className={styles.metaPercent}>70%</span>
                  </div>

                  <div className={styles.metaValuesRow}>
                    <div className={styles.metaValueGroup}>
                      <span className={styles.metaLabel}>Realizado</span>
                      <span className={styles.metaValue}>R$ 420.000</span>
                    </div>
                    <div className={styles.metaValueGroup} style={{ alignItems: 'flex-end' }}>
                      <span className={styles.metaLabel}>Objetivo Total</span>
                      <span className={styles.metaValueMuted}>R$ 600.000</span>
                    </div>
                  </div>

                  <div className={styles.metaProgressBar}>
                    <div
                      className={`${styles.metaProgressFill} ${styles.metaProgressFillBlue}`}
                      style={{ width: '69%' }}
                    />
                  </div>
                </div>

                <div className={styles.metaFooter}>
                  <StarIcon />
                  Faltando R$ 180.000 para atingir a meta
                </div>
              </div>

              {/* Meta da Representação */}
              <div className={styles.metaCard}>
                <div className={styles.metaCardBgLogo} aria-hidden="true">
                  <img src="/sylo-3d-logo.png" alt="" />
                </div>

                <div>
                  <div className={styles.metaCardTopRow}>
                    <div className={styles.metaCardTitleWrap}>
                      <div className={styles.metaCardIconWrap}>
                        <TeamIcon />
                      </div>
                      <div>
                        <p className={styles.metaCardTitle}>Meta da Representação</p>
                        <p className={styles.metaCardSubtitle}>Filial Alpha Consórcios Brasil</p>
                      </div>
                    </div>
                    <div className={styles.metaPercentRight}>
                      <span className={styles.metaPercent}>77%</span>
                      <span className={styles.metaDiasRestantes}>18 dias úteis restantes</span>
                    </div>
                  </div>

                  <div className={styles.metaValuesRow}>
                    <div className={styles.metaValueGroup}>
                      <span className={styles.metaLabel}>Produção Consolidada</span>
                      <span className={styles.metaValue}>R$ 3.850.000</span>
                    </div>
                    <div className={styles.metaValueGroup} style={{ alignItems: 'flex-end' }}>
                      <span className={styles.metaLabel}>Teto da Filial</span>
                      <span className={styles.metaValueMuted}>R$ 5.000.000</span>
                    </div>
                  </div>

                  <div className={styles.metaProgressBar}>
                    <div
                      className={`${styles.metaProgressFill} ${styles.metaProgressFillGreen}`}
                      style={{ width: '76%' }}
                    />
                  </div>
                </div>

                <div className={styles.metaFooter}>
                  <TrendUpIcon />
                  Ritmo diário: R$ 213.800 / dia
                </div>
              </div>
            </div>
          )}

          {/* ── Tarefas ───────────────────────────────────────────────── */}
          {isLoading ? (
            <div className={styles.skeletonTarefasCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Skeleton variant="text" width="100px" height="22px" />
                  <Skeleton variant="text" width="280px" height="14px" />
                </div>
                <Skeleton variant="rect" width="90px" height="36px" style={{ borderRadius: 99 }} />
              </div>
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles.skeletonTarefaRow}>
                  <Skeleton variant="text" width="80%" height="14px" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Skeleton variant="text" width="90%" height="13px" />
                    <Skeleton variant="text" width="70%" height="11px" />
                  </div>
                  <Skeleton variant="text" width="80px" height="16px" />
                  <Skeleton
                    variant="rect"
                    width="80px"
                    height="28px"
                    style={{ borderRadius: 99 }}
                  />
                  <Skeleton
                    variant="rect"
                    width="90px"
                    height="28px"
                    style={{ borderRadius: 99 }}
                  />
                  <Skeleton variant="circle" width="36px" height="36px" />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.tarefasCard}>
              <div className={styles.tarefasHeader}>
                <div>
                  <h2 className={styles.tarefasTitle}>Tarefas</h2>
                  <p className={styles.tarefasSubtitle}>
                    Propostas de alto valor com previsão de assembleia nos próximos 15 dias
                  </p>
                </div>
                <div className={styles.tarefasHeaderActions}>
                  <Link to="/app/tarefas" className={styles.verTudoBtn}>
                    Ver tudo
                  </Link>
                  <button type="button" className={styles.filtrarBtn}>
                    Filtrar <ChevronDownIcon />
                  </button>
                </div>
              </div>

              <table className={styles.tarefasTable}>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Segmento</th>
                    <th>Valor</th>
                    <th>Tarefa</th>
                    <th>Status</th>
                    <th>Ação Direta</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_TAREFAS.map((t) => (
                    <tr key={t.id}>
                      <td className={styles.clienteNome}>{t.cliente}</td>
                      <td>
                        <p className={styles.segmentoNome}>{t.segmento}</p>
                        <p className={styles.segmentoGrupo}>{t.cota}</p>
                      </td>
                      <td className={styles.valorCell}>{t.valor}</td>
                      <td>
                        <span className={styles.tarefaPill}>{t.tarefa}</span>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${STATUS_CLASS[t.status]}`}>
                          {t.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            className={styles.whatsappBtn}
                            aria-label={`WhatsApp — ${t.cliente}`}
                            onClick={() =>
                              window.open(`https://wa.me/55${t.phone.replace(/\D/g, '')}`, '_blank')
                            }
                          >
                            <WhatsAppIcon />
                          </button>
                          <button
                            type="button"
                            className={styles.viewBtn}
                            aria-label={`Ver tarefa — ${t.cliente}`}
                            onClick={() => navigate('/app/tarefas')}
                          >
                            <EyeIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── KPIs inferiores ───────────────────────────────────────── */}
          {isLoading ? (
            <div className={styles.skeletonKpiGrid}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={styles.skeletonKpiCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Skeleton variant="text" width="60%" height="13px" />
                    <Skeleton
                      variant="rect"
                      width="32px"
                      height="32px"
                      style={{ borderRadius: 8 }}
                    />
                  </div>
                  <Skeleton variant="text" width="70px" height="36px" />
                  <Skeleton variant="text" width="80%" height="13px" />
                  <Skeleton variant="text" width="50%" height="13px" />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <div className={styles.kpiTopRow}>
                  <span className={styles.kpiLabel}>Cartas em Andamento</span>
                  <span className={styles.kpiIconSlot} />
                </div>
                <span className={styles.kpiValue}>439</span>
                <span className={styles.kpiDesc}>Propostas ativas no funil geral</span>
                <span className={`${styles.kpiAccent} ${styles.kpiAccentGreen}`}>
                  +14 novas nesta semana
                </span>
              </div>

              <div className={styles.kpiCard}>
                <div className={styles.kpiTopRow}>
                  <span className={styles.kpiLabel}>Novos Leads de Consórcio</span>
                  <span className={styles.kpiIconSlot} />
                </div>
                <span className={styles.kpiValue}>26</span>
                <span className={styles.kpiDesc}>Aguardando primeiro contato</span>
              </div>

              <div className={styles.kpiCard}>
                <div className={styles.kpiTopRow}>
                  <span className={styles.kpiLabel}>Volume Contemplado</span>
                  <span className={styles.kpiIconSlot} />
                </div>
                <span className={styles.kpiValue}>R$ 1,25M</span>
                <span className={styles.kpiDesc}>Taxa média de lance: 34%</span>
                <span className={`${styles.kpiAccent} ${styles.kpiAccentGreen}`}>
                  9 cartas liberadas este mês
                </span>
              </div>

              <div className={styles.kpiCard}>
                <div className={styles.kpiTopRow}>
                  <span className={styles.kpiLabel}>Ticket Médio de Venda</span>
                  <span className={styles.kpiIconSlot} />
                </div>
                <span className={styles.kpiValue}>R$ 185.000</span>
                <span className={styles.kpiDesc}>Meta média: R$ 160.000</span>
                <span className={`${styles.kpiAccent} ${styles.kpiAccentPositive}`}>
                  +8.2% vs mês anterior
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
