// Mural de Conquistas do Perfil: dados da API (GET /dashboard/me/achievements)
// → medalhas (emoji, cor, data e progresso).

import type { Achievement } from './dashboard-api'

export interface Badge {
  id: Achievement['id']
  emoji: string
  bg: string
  name: string
  desc: string
  /** "dd/mm/aaaa" de quando desbloqueou. */
  date: string | null
  unlocked: boolean
  /** Metas com alvo ainda bloqueadas: "R$ 400 mil de R$ 500 mil", "7 de 10". */
  progressText: string | null
  /** O que fazer pra desbloquear. */
  hint: string
}

const VISUAL: Record<Achievement['id'], { emoji: string; bg: string; hint: string }> = {
  first_quota: {
    emoji: '🚀',
    bg: '#fef3c7',
    hint: 'Marque seu primeiro lead como Ganho no Comercial.',
  },
  sold_500k: { emoji: '💰', bg: '#dcfce7', hint: 'Some R$ 500 mil em crédito vendido.' },
  sold_1m: { emoji: '🏆', bg: '#fef3c7', hint: 'Some R$ 1 milhão em crédito vendido.' },
  sold_3m: { emoji: '💎', bg: '#e0f2fe', hint: 'Some R$ 3 milhões em crédito vendido.' },
  sold_5m: { emoji: '👑', bg: '#ede9fe', hint: 'Some R$ 5 milhões em crédito vendido.' },
  sold_10m: { emoji: '🌟', bg: '#fce7f3', hint: 'Some R$ 10 milhões em crédito vendido.' },
  first_assembly: {
    emoji: '📅',
    bg: '#ffedd5',
    hint: 'Uma cota sua precisa chegar a "Em dia" no funil Pós-venda.',
  },
  first_contemplation: {
    emoji: '🎉',
    bg: '#fae8ff',
    hint: 'Uma cota sua precisa chegar a "Contemplado" no funil Pós-venda.',
  },
  // Administrativo
  first_effective: {
    emoji: '✅',
    bg: '#dcfce7',
    hint: 'Leve uma cota até Efetivado (Ganho) no funil ADM.',
  },
  effective_10: { emoji: '📋', bg: '#e0f2fe', hint: 'Efetive 10 cotas no funil ADM.' },
  effective_50: { emoji: '🏅', bg: '#fef3c7', hint: 'Efetive 50 cotas no funil ADM.' },
  effective_100: { emoji: '👑', bg: '#ede9fe', hint: 'Efetive 100 cotas no funil ADM.' },
  checklist_100: {
    emoji: '☑️',
    bg: '#fce7f3',
    hint: 'Marque 100 itens de checklist no ADM e no Pós-venda.',
  },
  first_payment_check: {
    emoji: '💳',
    bg: '#dcfce7',
    hint: 'Responda Pagou / Não pagou numa tarefa "Confirmar pagamento".',
  },
  assembly_followed: {
    emoji: '📅',
    bg: '#ffedd5',
    hint: 'Marque "1ª parcela paga" ou "Participou da 1ª assembleia" numa cota.',
  },
  contemplation_followed: {
    emoji: '🎉',
    bg: '#fae8ff',
    hint: 'Marque "Contemplado" numa cota do Pós-venda.',
  },
}

function formatMoneyShort(cents: number): string {
  const reais = cents / 100
  if (reais >= 1_000_000) {
    return `R$ ${(reais / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  }
  return `R$ ${Math.round(reais / 1000).toLocaleString('pt-BR')} mil`
}

function progressText(progress: NonNullable<Achievement['progress']>): string {
  const format =
    progress.unit === 'cents' ? formatMoneyShort : (value: number) => value.toLocaleString('pt-BR')
  return `${format(progress.current)} de ${format(progress.target)}`
}

export function toBadge(achievement: Achievement): Badge {
  const visual = VISUAL[achievement.id]
  const unlocked = achievement.unlockedAt !== null
  return {
    id: achievement.id,
    emoji: visual.emoji,
    bg: visual.bg,
    name: achievement.title,
    desc: achievement.description,
    date: achievement.unlockedAt
      ? new Date(achievement.unlockedAt).toLocaleDateString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
        })
      : null,
    unlocked,
    progressText: !unlocked && achievement.progress ? progressText(achievement.progress) : null,
    hint: visual.hint,
  }
}
