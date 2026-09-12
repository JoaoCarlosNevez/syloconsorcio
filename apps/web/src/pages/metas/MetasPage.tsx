// MetasPage — progressão de nível e metas do consultor.
//
// Exibe os 4 níveis (Turmalina → Rubi → Platina → Diamante),
// o nível atual destacado, as metas com barras de progresso
// e os requisitos do próximo nível.
// Dados são mock até integração com a API real.

import { ProgressBar, Skeleton, TierBadge } from '@sylocrm/ui'
import type { Tier } from '@sylocrm/ui'
import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import styles from './MetasPage.module.css'

// ── Definição dos níveis ──────────────────────────────────────────────────────

interface TierConfig {
  tier: Tier
  label: string
  emoji: string
  descricao: string
}

const TIERS: TierConfig[] = [
  {
    tier: 'turmalina',
    label: 'Turmalina',
    emoji: '💎',
    descricao: 'Nível inicial — bem-vindo ao time',
  },
  { tier: 'rubi', label: 'Rubi', emoji: '🔴', descricao: 'Consultores com resultado consistente' },
  { tier: 'platina', label: 'Platina', emoji: '🔵', descricao: 'Alta performance e volume' },
  {
    tier: 'diamante',
    label: 'Diamante',
    emoji: '🟣',
    descricao: 'Elite — top consultores do time',
  },
]

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

// Próximo nível (Platina) — benefícios
const PROXIMO_NIVEL_BENEFICIOS = [
  'Comissão extra de 5% por fechamento',
  'Acesso ao relatório de inteligência de mercado',
  'Destaque no ranking regional',
  'Mentoria individual mensal com Sara IA',
]

// TODO: buscar tier real do perfil via API
const USER_TIER: Tier = 'rubi'
const PROXIMO_TIER: Tier = 'platina'
const PROXIMO_TIER_CONFIG = TIERS.find((t) => t.tier === PROXIMO_TIER)!

// ── Componente do stepper ─────────────────────────────────────────────────────

function TierStepper({ currentTier }: { currentTier: Tier }) {
  const currentIndex = TIERS.findIndex((t) => t.tier === currentTier)

  return (
    <div className={styles.tierStepper}>
      <p className={styles.stepperTitle}>Sua progressão de nível</p>

      <div className={styles.stepperTrack}>
        {TIERS.map((config, index) => {
          const isDone = index < currentIndex
          const isCurrent = index === currentIndex
          const isPending = index > currentIndex

          const circleState = isCurrent ? 'current' : isDone ? 'done' : 'pending'
          const labelState = isCurrent ? 'current' : isPending ? 'pending' : ''

          return (
            <div key={config.tier} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div className={styles.stepperItem}>
                <div
                  className={[
                    styles.stepperCircle,
                    styles[circleState],
                    isCurrent ? styles[config.tier] : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label={`Nível ${config.label}${isCurrent ? ' — nível atual' : ''}`}
                >
                  {config.emoji}
                </div>
                <div>
                  <p
                    className={[styles.stepperLabel, labelState ? styles[labelState] : '']
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {config.label}
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
  const [isLoading, setIsLoading] = useState(true)

  // Simula carregamento — remover quando a API estiver integrada
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500)
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
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
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
                  {i < 3 && (
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
          <TierStepper currentTier={USER_TIER} />
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
                    Conclua as metas abaixo para avançar para <strong>Platina</strong>
                  </p>
                </div>
              )}
              {!isLoading && <TierBadge tier={USER_TIER} />}
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
                <div className={styles.proximoIcone}>{PROXIMO_TIER_CONFIG.emoji}</div>
                <div>
                  <p className={styles.proximoNome}>Próximo: {PROXIMO_TIER_CONFIG.label}</p>
                  <p className={styles.proximoDescricao}>{PROXIMO_TIER_CONFIG.descricao}</p>
                </div>
              </div>

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
                Faltam <span className={styles.proximoFaltamDestaque}>2 metas</span> para atingir{' '}
                <TierBadge tier={PROXIMO_TIER} />
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
