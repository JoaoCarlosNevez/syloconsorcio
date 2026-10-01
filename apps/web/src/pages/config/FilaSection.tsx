// Configurações > Fila de Leads — distribuição em rodízio dos leads que
// chegam pelo webhook sem responsável. O lead é oferecido ao primeiro da
// fila, que vai pro fim; se ele não aceitar no prazo, o lead vai pro próximo.
// Depois que todos deixaram passar, Dono e Supervisores são avisados.
//
// Regras no backend: OfferLeadToQueueUseCase / ProcessExpiredLeadOffersUseCase.

import { Skeleton, useToast } from '@sylocrm/ui'
import { type FormEvent, useEffect, useState } from 'react'
import { useLeadQueueQuery, useUpdateLeadQueue } from '../../hooks/useLeadQueue'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useTeamMembersQuery } from '../../hooks/useTeam'
import { LEAD_QUEUE_TIMEOUT_LIMITS, formatCountdown } from '../../lib/lead-queue-api'
import type { TeamMember } from '../../lib/team-api'
import styles from './ConfigPage.module.css'
import fila from './FilaSection.module.css'

const QUEUE_PERMISSION = 'lead_queue.manage'

const ROLE_LABEL: Record<TeamMember['role'], string> = {
  ADMIN: 'Dono',
  MANAGER: 'Supervisor',
  SELLER: 'Vendedor',
}

interface FormState {
  enabled: boolean
  timeoutMinutes: string
  memberUserIds: string[]
}

function memberName(members: TeamMember[], userId: string): string {
  const member = members.find((m) => m.userId === userId)
  return member ? (member.name ?? member.email) : 'Membro removido'
}

export function FilaSection() {
  const { organizationId, membership } = useActiveOrganization()
  const canManage = membership?.permissions.includes(QUEUE_PERMISSION) ?? false
  const { data, isLoading } = useLeadQueueQuery(organizationId, canManage)
  const { data: teamData } = useTeamMembersQuery(organizationId)
  const updateQueue = useUpdateLeadQueue(organizationId)
  const { toast } = useToast()
  const [form, setForm] = useState<FormState | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const activeMembers = (teamData?.members ?? []).filter((m) => m.status === 'ACTIVE')

  // Preenche o formulário uma vez, quando a configuração chega. Fila nunca
  // configurada: já sugere todos os vendedores.
  useEffect(() => {
    if (form || !data || !teamData) return
    const neverConfigured = !data.settings.enabled && data.settings.memberUserIds.length === 0
    setForm({
      enabled: data.settings.enabled,
      timeoutMinutes: String(data.settings.timeoutMinutes),
      memberUserIds: neverConfigured
        ? teamData.members
            .filter((m) => m.status === 'ACTIVE' && m.role === 'SELLER')
            .map((m) => m.userId)
        : data.settings.memberUserIds,
    })
  }, [data, teamData, form])

  const pendingCount = data?.pendingOffers.length ?? 0
  useEffect(() => {
    if (pendingCount === 0) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [pendingCount])

  if (!canManage) {
    return (
      <div className={styles.settingsContent}>
        <div className={styles.settingsCard}>
          <div className={styles.settingsCardBody}>
            <p className={fila.muted}>Só Dono e Supervisores configuram a fila de leads.</p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading || !form) {
    return (
      <div className={styles.settingsContent}>
        <div className={styles.settingsCard}>
          <div className={styles.settingsCardBody}>
            <Skeleton width="40%" height={18} />
            <Skeleton width="100%" height={40} />
            <Skeleton width="100%" height={120} />
          </div>
        </div>
      </div>
    )
  }

  function toggleMember(userId: string) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            memberUserIds: prev.memberUserIds.includes(userId)
              ? prev.memberUserIds.filter((id) => id !== userId)
              : [...prev.memberUserIds, userId],
          }
        : prev,
    )
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form) return
    const timeoutMinutes = Number.parseInt(form.timeoutMinutes, 10)
    const { min, max } = LEAD_QUEUE_TIMEOUT_LIMITS
    if (Number.isNaN(timeoutMinutes) || timeoutMinutes < min || timeoutMinutes > max) {
      toast({
        type: 'error',
        title: `O tempo pra aceitar precisa ser entre ${min} e ${max} minutos.`,
      })
      return
    }
    if (form.enabled && form.memberUserIds.length === 0) {
      toast({ type: 'error', title: 'Escolha pelo menos uma pessoa pra fila.' })
      return
    }
    updateQueue.mutate(
      { enabled: form.enabled, timeoutMinutes, memberUserIds: form.memberUserIds },
      {
        onSuccess: () => toast({ type: 'success', title: 'Fila de leads salva' }),
        onError: (error) =>
          toast({
            type: 'error',
            title: 'Não foi possível salvar a fila',
            description: error instanceof Error ? error.message : undefined,
          }),
      },
    )
  }

  const members = teamData?.members ?? []

  return (
    <div className={styles.settingsContent}>
      <form className={styles.settingsCard} onSubmit={handleSubmit}>
        <div className={styles.settingsCardHeader}>
          <div className={styles.settingsCardTitle}>Fila de Leads</div>
          <div className={styles.settingsCardDesc}>
            Leads que chegam pelo webhook sem responsável são oferecidos em rodízio. Quem recebe vai
            pro fim da fila; se não aceitar no prazo, o lead vai pro próximo.
          </div>
        </div>
        <div className={styles.settingsCardBody}>
          <div className={styles.notifRow}>
            <div>
              <div className={styles.notifRowLabel}>Distribuir leads pela fila</div>
              <div className={styles.notifRowDesc}>
                Desligada, os leads sem responsável só avisam Dono e Supervisores.
              </div>
            </div>
            <div className={styles.notifCell}>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  aria-label="Distribuir leads pela fila"
                  checked={form.enabled}
                  onChange={() => setForm({ ...form, enabled: !form.enabled })}
                />
                <span className={styles.toggleTrack} />
                <span className={styles.toggleThumb} />
              </label>
            </div>
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="queue-timeout">
              Tempo pra aceitar (minutos)
            </label>
            <input
              id="queue-timeout"
              className={`${styles.formInput} ${fila.timeoutInput}`}
              inputMode="numeric"
              value={form.timeoutMinutes}
              onChange={(e) =>
                setForm({ ...form, timeoutMinutes: e.target.value.replace(/[^0-9]/g, '') })
              }
            />
          </div>

          <div className={styles.formRow}>
            <span className={styles.formLabel}>Quem participa da fila</span>
            {activeMembers.length === 0 ? (
              <p className={fila.muted}>Nenhum membro ativo na equipe.</p>
            ) : (
              <ul className={fila.memberList}>
                {activeMembers.map((member) => (
                  <li key={member.userId}>
                    <label className={fila.memberRow}>
                      <input
                        type="checkbox"
                        checked={form.memberUserIds.includes(member.userId)}
                        onChange={() => toggleMember(member.userId)}
                      />
                      <img
                        className={fila.avatar}
                        src={member.avatarUrl ?? '/default-avatar.svg'}
                        alt=""
                      />
                      <span className={fila.memberName}>{member.name ?? member.email}</span>
                      <span className={fila.memberRole}>{ROLE_LABEL[member.role]}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={fila.actions}>
            <button type="submit" className={styles.primaryBtn} disabled={updateQueue.isPending}>
              {updateQueue.isPending ? 'Salvando…' : 'Salvar fila'}
            </button>
          </div>
        </div>
      </form>

      <div className={styles.settingsCard}>
        <div className={styles.settingsCardHeader}>
          <div className={styles.settingsCardTitle}>Ordem atual</div>
          <div className={styles.settingsCardDesc}>
            O primeiro recebe o próximo lead. Atualiza sozinha a cada poucos segundos.
          </div>
        </div>
        <div className={styles.settingsCardBody}>
          {data && data.queue.length > 0 ? (
            <ol className={fila.queueList}>
              {data.queue.map((item, index) => (
                <li key={item.userId} className={fila.queueItem}>
                  <span className={fila.position}>{index + 1}</span>
                  <span className={fila.memberName}>{memberName(members, item.userId)}</span>
                  {index === 0 && <span className={fila.nextBadge}>Próximo</span>}
                </li>
              ))}
            </ol>
          ) : (
            <p className={fila.muted}>Ninguém na fila ainda — salve a configuração acima.</p>
          )}

          {data && data.pendingOffers.length > 0 && (
            <>
              <span className={styles.formLabel}>Aguardando aceite</span>
              <ul className={fila.queueList}>
                {data.pendingOffers.map((offer) => (
                  <li key={offer.id} className={fila.queueItem}>
                    <span className={fila.memberName}>
                      {offer.leadName} → {memberName(members, offer.userId)}
                    </span>
                    <span className={fila.countdown}>{formatCountdown(offer.expiresAt, now)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
