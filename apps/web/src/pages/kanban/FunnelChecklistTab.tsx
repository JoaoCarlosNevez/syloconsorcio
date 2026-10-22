// FunnelChecklistTab — aba "Checklist" do card nos funis ADM e Pós-venda.
// Marcar um item grava quem/quando, vai pro histórico e pode mover o card pra
// frente (ex: "1ª parcela paga" → Em dia) — regras na API
// (application/src/funnels/funnel-checklists.ts).

import { Skeleton, useToast } from '@sylocrm/ui'
import {
  useAnswerInstallmentPayment,
  useLeadChecklistQuery,
  useSetLeadChecklistItem,
} from '../../hooks/useLeads'
import type { TeamMember } from '../../lib/team-api'
import styles from './AdhesionTab.module.css'

export function FunnelChecklistTab({
  organizationId,
  leadId,
  members,
  readOnly,
}: {
  organizationId: string | null
  leadId: string
  members: TeamMember[]
  /** Vendedor no ADM: só acompanha. */
  readOnly: boolean
}) {
  const { data, isLoading } = useLeadChecklistQuery(organizationId, leadId)
  const setItem = useSetLeadChecklistItem(organizationId, leadId)
  const answerPayment = useAnswerInstallmentPayment(organizationId, leadId)
  const { toast } = useToast()

  async function answer(paid: boolean) {
    try {
      await answerPayment.mutateAsync(paid)
      toast({
        type: paid ? 'success' : 'warning',
        title: paid ? 'Pagamento confirmado' : 'Parcela marcada como atrasada',
        description: paid
          ? 'A tarefa foi concluída e a parcela entrou no checklist.'
          : 'A tarefa foi concluída e o card foi pra Atrasado.',
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível registrar o pagamento',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  async function toggle(itemKey: string, checked: boolean) {
    try {
      await setItem.mutateAsync({ itemKey, checked })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível atualizar o checklist',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  if (isLoading || !data) {
    return (
      <div className={styles.loading}>
        <Skeleton width="100%" height={48} />
        <Skeleton width="100%" height={48} />
        <Skeleton width="100%" height={48} />
      </div>
    )
  }

  const done = data.items.filter((item) => item.checked).length
  const percent = data.items.length ? Math.round((done / data.items.length) * 100) : 0
  const nameOf = (userId: string | null) => {
    const member = members.find((m) => m.userId === userId)
    return member ? (member.name ?? member.email) : null
  }

  return (
    <div className={styles.tab}>
      <div className={styles.progressCard}>
        <div className={styles.progressHeader}>
          <div>
            <span className={styles.progressTitle}>
              Checklist {data.funnelKind === 'BACKOFFICE' ? 'do ADM' : 'do Pós-venda'}
            </span>
            <span className={styles.progressCount}>
              {done} de {data.items.length} itens
            </span>
          </div>
          <span className={percent === 100 ? styles.badgeDone : styles.badgePending}>
            {percent === 100 ? 'Completo' : `${percent}%`}
          </span>
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${percent}%` }} />
        </div>
        <p className={styles.documentNote}>
          {data.funnelKind === 'BACKOFFICE'
            ? 'O Ganho (Efetivado) só é liberado com todos os itens marcados.'
            : 'Marcar "1ª parcela paga" leva o card pra "Em dia"; "Contemplado" leva pra Contemplado.'}
          {readOnly && ' Você acompanha — quem marca é o Administrativo.'}
        </p>
      </div>

      {data.funnelKind === 'POST_SALE' && (
        <div
          className={styles.documentRow}
          style={
            data.pendingPayment ? { borderColor: '#fcd34d', background: '#fffbeb' } : undefined
          }
        >
          <span className={styles.documentInfo}>
            <span className={styles.documentLabel}>
              {data.pendingPayment ? data.pendingPayment.title : 'Parcela do mês'}
            </span>
            <span className={styles.documentHint}>
              {data.pendingPayment
                ? 'O cliente pagou o boleto desta parcela?'
                : 'Sem confirmação pendente. A tarefa chega no dia seguinte ao vencimento (dia do vencimento na aba Adesão).'}
            </span>
          </span>
          <span className={styles.documentActions}>
            <button
              type="button"
              className={styles.dangerBtn}
              onClick={() => answer(false)}
              disabled={answerPayment.isPending}
            >
              Não pagou
            </button>
            <button
              type="button"
              className={styles.uploadBtn}
              onClick={() => answer(true)}
              disabled={answerPayment.isPending}
            >
              Pagou
            </button>
          </span>
        </div>
      )}

      <div className={styles.documents}>
        {data.items.map((item) => {
          const who = nameOf(item.checkedByUserId)
          return (
            <label
              key={item.key}
              className={styles.documentRow}
              style={{ cursor: readOnly ? 'default' : 'pointer' }}
            >
              <input
                type="checkbox"
                checked={item.checked}
                disabled={readOnly || setItem.isPending}
                onChange={(e) => toggle(item.key, e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#10b981' }}
              />
              <span className={styles.documentInfo}>
                <span className={styles.documentLabel}>{item.label}</span>
                {item.checked && item.checkedAt && (
                  <span className={styles.documentHint}>
                    Marcado em {new Date(item.checkedAt).toLocaleDateString('pt-BR')}
                    {who ? ` por ${who}` : ''}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
