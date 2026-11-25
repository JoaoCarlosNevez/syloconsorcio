// Nova tarefa pelo celular: título, tipo, lead (fixo quando vem da ficha do
// lead, ou buscado), responsável (só com task.assign — pessoa ou fila do
// setor), prazo e observação. Regras em lib/mobile-task.ts.

import { type FormEvent, useState } from 'react'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useLeadsQuery } from '../../hooks/useLeads'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useCreateTask } from '../../hooks/useTasks'
import { useTeamMembersQuery } from '../../hooks/useTeam'
import { tomorrowAtTen } from '../../lib/mobile'
import {
  type MobileTaskForm,
  mobileTaskPayload,
  sectorAssignee,
  toDatetimeLocalValue,
} from '../../lib/mobile-task'
import { SECTORS, SECTOR_LABEL } from '../../lib/sectors'
import type { TaskType } from '../../lib/tasks-api'
import { TASK_TYPES } from '../tarefas/tarefas.types'
import styles from './Mobile.module.css'
import { Sheet, useDebounced } from './MobileUi'

interface LeadRef {
  id: string
  name: string
}

export function MobileTaskSheet({
  lead,
  onClose,
  onCreated,
}: {
  /** Aberta da ficha do lead: a tarefa já fica ligada a ele. */
  lead?: LeadRef
  onClose: () => void
  onCreated: () => void
}) {
  const { organizationId, membership } = useActiveOrganization()
  const canAssign = membership?.permissions.includes('task.assign') ?? false
  const { data: currentUser } = useCurrentUser()
  const team = useTeamMembersQuery(canAssign ? organizationId : null)
  const members = (team.data?.members ?? []).filter((m) => m.status === 'ACTIVE')
  const createTask = useCreateTask(organizationId)

  const [form, setForm] = useState<MobileTaskForm>(() => ({
    title: lead ? `Ligar para ${lead.name}` : '',
    type: 'Ligação',
    leadId: lead?.id ?? null,
    assignee: currentUser?.id ?? '',
    noDueAt: false,
    dueAt: toDatetimeLocalValue(tomorrowAtTen(new Date())),
    notes: '',
  }))
  const [pickedLead, setPickedLead] = useState<LeadRef | null>(lead ?? null)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof MobileTaskForm>(key: K, value: MobileTaskForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function pickLead(next: LeadRef | null) {
    setPickedLead(next)
    set('leadId', next?.id ?? null)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    // O responsável padrão é quem cria — o usuário pode carregar depois de abrir.
    const assignee = form.assignee || currentUser?.id || ''
    const result = mobileTaskPayload({ ...form, assignee }, canAssign)
    if (!result.ok) return setError(result.error)
    try {
      await createTask.mutateAsync(result.payload)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu pra criar a tarefa.')
    }
  }

  return (
    <Sheet onClose={onClose}>
      <h3>Nova tarefa</h3>
      <form className={styles.form} onSubmit={onSubmit}>
        <label className={styles.field}>
          Título
          <input
            className={styles.input}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Ex: Ligar para João Silva"
            required
          />
        </label>

        <div className={styles.field}>
          Tipo
          <div className={`${styles.chips} ${styles.chipsWrap}`}>
            {TASK_TYPES.map((type: TaskType) => (
              <button
                key={type}
                type="button"
                className={`${styles.chip} ${form.type === type ? styles.chipOn : ''}`}
                onClick={() => set('type', type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {lead ? (
          <label className={styles.field}>
            Lead / Cliente
            <input className={styles.input} value={lead.name} disabled />
          </label>
        ) : (
          <LeadPicker organizationId={organizationId} picked={pickedLead} onPick={pickLead} />
        )}

        {canAssign && (
          <label className={styles.field}>
            Responsável
            <select
              className={styles.input}
              value={form.assignee || currentUser?.id || ''}
              onChange={(e) => set('assignee', e.target.value)}
            >
              <optgroup label="Pessoa">
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.userId === currentUser?.id ? 'Você' : (member.name ?? member.email)}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Setor (quem pegar primeiro)">
                {SECTORS.map((sector) => (
                  <option key={sector} value={sectorAssignee(sector)}>
                    Fila {SECTOR_LABEL[sector]}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
        )}

        <label className={styles.field}>
          Data e horário
          <input
            className={styles.input}
            type="datetime-local"
            value={form.dueAt}
            disabled={form.noDueAt}
            onChange={(e) => set('dueAt', e.target.value)}
          />
        </label>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={form.noDueAt}
            onChange={(e) => set('noDueAt', e.target.checked)}
          />
          Sem prazo
        </label>

        <label className={styles.field}>
          Observações
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            rows={2}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Opcional"
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}
        <button
          type="submit"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={createTask.isPending}
        >
          {createTask.isPending ? 'Criando…' : 'Criar tarefa'}
        </button>
      </form>
    </Sheet>
  )
}

/** Busca o lead pelo nome ou telefone (no servidor), ou deixa a tarefa avulsa. */
function LeadPicker({
  organizationId,
  picked,
  onPick,
}: {
  organizationId: string | null
  picked: LeadRef | null
  onPick: (lead: LeadRef | null) => void
}) {
  const [query, setQuery] = useState('')
  const search = useDebounced(query.trim())
  const leads = useLeadsQuery(
    organizationId,
    { search: search || undefined, pageSize: 8, outcome: 'todos' },
    { keepPrevious: true, enabled: picked === null && search.length >= 2 },
  )

  if (picked) {
    return (
      <div className={styles.field}>
        Lead / Cliente
        <div className={styles.pickedLead}>
          <span className={styles.grow}>{picked.name}</span>
          <button type="button" className={styles.link} onClick={() => onPick(null)}>
            Trocar
          </button>
        </div>
      </div>
    )
  }

  const results = search.length >= 2 ? (leads.data?.items ?? []) : []
  return (
    <div className={styles.field}>
      <label htmlFor="task-lead-search">Lead / Cliente (opcional)</label>
      <input
        id="task-lead-search"
        className={styles.input}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nome ou telefone"
      />
      {results.length > 0 && (
        <div className={styles.options}>
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.option}
              onClick={() => onPick({ id: item.id, name: item.name })}
            >
              {item.name}
              <small>{item.phone}</small>
            </button>
          ))}
        </div>
      )}
      {search.length >= 2 && !leads.isFetching && results.length === 0 && (
        <span className={styles.note}>Nenhum lead encontrado.</span>
      )}
      {search.length < 2 && <span className={styles.note}>Sem lead, a tarefa fica avulsa.</span>}
    </div>
  )
}
