// MetasPage — progressão de nível e metas do consultor.
//
// Exibe as 5 patentes (Bronze → Prata → Ouro → Platina → Diamante), com a
// patente atual (definida pelo gestor em Configurações → Equipe) destacada,
// as metas com barras de progresso e os requisitos da próxima patente.
// Metas e benefícios são mock até integração com a API real.

import { ProgressBar, Skeleton, TIERS, TIER_COLORS, TIER_LABELS, TierBadge } from '@sylocrm/ui'
import type { Tier } from '@sylocrm/ui'
import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import { useActiveOrganization } from '../../hooks/useOrganization'
import styles from './MetasPage.module.css'

// ── Definição dos níveis ──────────────────────────────────────────────────────

const TIER_DETAILS: Record<Tier, { emoji: string; descricao: string }> = {
  bronze: { emoji: '🥉', descricao: 'Nível inicial — bem-vindo ao time' },
  prata: { emoji: '🥈', descricao: 'Primeiros resultados consistentes' },
  ouro: { emoji: '🥇', descricao: 'Consultores com resultado consistente' },
  platina: { emoji: '💠', descricao: 'Alta performance e volume' },
  diamante: { emoji: '💎', descricao: 'Elite — top consultores do time' },
}

/** Patente seguinte na progressão, ou null quando já está no topo. */
function nextTier(tier: Tier): Tier | null {
  return TIERS[TIERS.indexOf(tier) + 1] ?? null
}

// ── Mock de metas ─────────────────────────────────────────────────────────────

// TODO: substituir por chamada à API
interface Meta {
  id: string
  nome: string
  atual: number
  total: number
  unidade: string
  progresso: number
  variant: 'green' | 'amber' | 'blue' | 'red'
}

const MOCK_METAS: Meta[] = [
  {
    id: '1',
    nome: 'Leads no pipeline',
    atual: 47,
    total: 60,
    unidade: 'leads',
    progresso: 78,
    variant: 'green',
  },
  {
    id: '2',
    nome: 'Conversões do mês',
    atual: 18,
    total: 25,
    unidade: 'conv.',
    progresso: 72,
    variant: 'amber',
  },
  {
    id: '3',
    nome: 'Receita gerada',
    atual: 84200,
    total: 100000,
    unidade: '',
    progresso: 84,
    variant: 'blue',
  },
  {
    id: '4',
    nome: 'Pontuação de atendimento',
    atual: 82,
    total: 100,
    unidade: 'pts',
    progresso: 82,
    variant: 'green',
  },
]

function formatMetaValor(meta: Meta): { atual: string; total: string } {
  if (meta.id === '3') {
    return {
      atual: `R$ ${(meta.atual / 1000).toFixed(0)}k`,
      total: `R$ ${(meta.total / 1000).toFixed(0)}k`,
    }
  }
  return {
    atual: `${meta.atual}${meta.unidade ? ` ${meta.unidade}` : ''}`,
    total: `${meta.total}${meta.unidade ? ` ${meta.unidade}` : ''}`,
  }
}

// Próxima patente — benefícios (mock)
const PROXIMO_NIVEL_BENEFICIOS = [
  'Comissão extra de 5% por fechamento',
  'Acesso ao relatório de inteligência de mercado',
  'Destaque no ranking regional',
]

// ── Componente do stepper ─────────────────────────────────────────────────────

function TierStepper({ currentTier }: { currentTier: Tier }) {
  const currentIndex = TIERS.indexOf(currentTier)

  return (
    <div className={styles.tierStepper}>
      <p className={styles.stepperTitle}>Sua progressão de nível</p>

      <div className={styles.stepperTrack}>
        {TIERS.map((tier, index) => {
          const isDone = index < currentIndex
          const isCurrent = index === currentIndex
          const isPending = index > currentIndex

          const circleState = isCurrent ? 'current' : isDone ? 'done' : 'pending'
          const labelState = isCurrent ? 'current' : isPending ? 'pending' : ''

          return (
            <div key={tier} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div className={styles.stepperItem}>
                <div
                  className={[styles.stepperCircle, styles[circleState]].join(' ')}
                  style={
                    isCurrent
                      ? ({ '--tier-accent': TIER_COLORS[tier].accent } as React.CSSProperties)
                      : undefined
                  }
                  aria-label={`Nível ${TIER_LABELS[tier]}${isCurrent ? ' — nível atual' : ''}`}
                >
                  {TIER_DETAILS[tier].emoji}
                </div>
                <div>
                  <p
                    className={[styles.stepperLabel, labelState ? styles[labelState] : '']
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {TIER_LABELS[tier]}
                  </p>
                  {isCurrent && <span className={styles.stepperBadge}>Atual</span>}
                </div>
              </div>

              {index < TIERS.length - 1 && (
                <div
                  className={[
                    styles.stepperConnector,
                    index < currentIndex ? styles.done : styles.pending,
                  ].join(' ')}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MetasPage ─────────────────────────────────────────────────────────────────

export function MetasPage() {
  const [isMockLoading, setIsMockLoading] = useState(true)
  const { membership } = useActiveOrganization()
  const isLoading = isMockLoading || !membership
  // Só é lido depois do carregamento, quando membership já existe.
  const currentTier: Tier = membership?.tier ?? 'bronze'
  const proximoTier = nextTier(currentTier)

  // Simula carregamento — remover quando a API estiver integrada
  useEffect(() => {
    const timer = setTimeout(() => setIsMockLoading(false), 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AppLayout>
      <div className={styles.page}>
        {/* ── Cabeçalho ────────────────────────────────────────────────── */}
        <header className={styles.header}>
          {isLoading ? (
            <>
              <Skeleton variant="text" width="180px" height="28px" />
              <Skeleton variant="text" width="300px" height="16px" style={{ marginTop: 4 }} />
            </>
          ) : (
            <>
              <h1 className={styles.title}>Minhas Metas</h1>
              <p className={styles.subtitle}>
                Acompanhe seu progresso e avance de nível no programa de consultores Sylo.
              </p>
            </>
          )}
        </header>

        {/* ── Stepper de níveis ─────────────────────────────────────────── */}
        {isLoading ? (
          <div className={styles.card} style={{ padding: 28 }}>
            <Skeleton variant="text" width="200px" height="13px" style={{ marginBottom: 24 }} />
            <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
              {TIERS.map((tier, i) => (
                <div key={tier} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Skeleton variant="circle" width="48px" height="48px" />
                    <Skeleton variant="text" width="64px" height="13px" />
                  </div>
                  {i < TIERS.length - 1 && (
                    <Skeleton
                      variant="rect"
                      height="3px"
                      style={{ flex: 1, margin: '0 8px', marginBottom: 32 }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <TierStepper currentTier={currentTier} />
        )}

        {/* ── Metas + Próximo nível ─────────────────────────────────────── */}
        <div className={styles.mainGrid}>
          {/* Metas do nível atual */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              {isLoading ? (
                <Skeleton variant="text" width="160px" height="16px" />
              ) : (
                <div>
                  <p className={styles.cardTitle}>Metas do nível atual</p>
                  <p className={styles.cardSubtitle}>
                    {proximoTier ? (
                      <>
                        Conclua as metas abaixo para avançar para{' '}
                        <strong>{TIER_LABELS[proximoTier]}</strong>
                      </>
                    ) : (
                      'Você está na patente mais alta — mantenha o ritmo'
                    )}
                  </p>
                </div>
              )}
              {!isLoading && <TierBadge tier={currentTier} />}
            </div>

            {isLoading ? (
              <div className={styles.skeletonMetas}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={styles.skeletonMetaItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Skeleton variant="text" width="45%" height="14px" />
                      <Skeleton variant="text" width="20%" height="14px" />
                    </div>
                    <Skeleton
                      variant="rect"
                      width="100%"
                      height="8px"
                      style={{ borderRadius: 99 }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.metasList}>
                {MOCK_METAS.map((meta) => {
                  const { atual, total } = formatMetaValor(meta)
                  return (
                    <div key={meta.id} className={styles.metaItem}>
                      <div className={styles.metaItemHeader}>
                        <span className={styles.metaNome}>{meta.nome}</span>
                        <div className={styles.metaValores}>
                          <span className={styles.metaAtual}>{atual}</span>
                          <span className={styles.metaDivisor}>/</span>
                          <span className={styles.metaTotal}>{total}</span>
                        </div>
                      </div>
                      <ProgressBar
                        value={meta.progresso}
                        variant={meta.variant}
                        showValue={false}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Próximo nível */}
          {isLoading ? (
            <div className={styles.card}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <Skeleton variant="circle" width="44px" height="44px" />
                <div style={{ flex: 1 }}>
                  <Skeleton variant="text" width="80px" height="16px" />
                  <Skeleton variant="text" width="120px" height="12px" style={{ marginTop: 6 }} />
                </div>
              </div>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}
                >
                  <Skeleton variant="circle" width="16px" height="16px" />
                  <Skeleton variant="text" width="80%" height="13px" />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.proximoCard}>
              <div className={styles.proximoHeader}>
                <div className={styles.proximoIcone}>
                  {TIER_DETAILS[proximoTier ?? currentTier].emoji}
                </div>
                <div>
                  <p className={styles.proximoNome}>
                    {proximoTier
                      ? `Próximo: ${TIER_LABELS[proximoTier]}`
                      : `Patente máxima: ${TIER_LABELS[currentTier]}`}
                  </p>
                  <p className={styles.proximoDescricao}>
                    {TIER_DETAILS[proximoTier ?? currentTier].descricao}
                  </p>
                </div>
              </div>

              {proximoTier && (
                <>
                  <div className={styles.proximoDivider} />

                  <div>
                    <p className={styles.cardSubtitle} style={{ marginBottom: 10 }}>
                      Benefícios desbloqueados
                    </p>
                    <div className={styles.proximoBeneficios}>
                      {PROXIMO_NIVEL_BENEFICIOS.map((beneficio) => (
                        <div key={beneficio} className={styles.beneficioItem}>
                          <span className={styles.beneficioCheck}>✓</span>
                          <span>{beneficio}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.proximoDivider} />

                  <p className={styles.proximoFaltam}>
                    Faltam <span className={styles.proximoFaltamDestaque}>2 metas</span> para
                    atingir <TierBadge tier={proximoTier} />
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
