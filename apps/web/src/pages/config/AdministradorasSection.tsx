// AdministradorasSection — Configurações → Administradoras: as administradoras
// de consórcio com que a organização trabalha, cada uma com seus e-mails.
// O nome vira sugestão no campo "Administradora" da ficha de adesão e os
// e-mails são o destino do "Enviar ficha pra administradora".
//
// Só o Dono (organization.update) cadastra e edita.

import { Modal, Skeleton, useToast } from '@sylocrm/ui'
import { type FormEvent, useState } from 'react'
import {
  useAdministratorsQuery,
  useCreateAdministrator,
  useDeleteAdministrator,
  useUpdateAdministrator,
} from '../../hooks/useAdministrators'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { type Administrator, parseEmails } from '../../lib/administrators-api'
import own from './AdministradorasSection.module.css'
import styles from './ConfigPage.module.css'

function AdministratorForm({
  initial,
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
}: {
  initial?: Administrator
  submitLabel: string
  isPending: boolean
  onSubmit: (payload: { name: string; emails: string[] }) => Promise<void>
  onCancel?: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [emails, setEmails] = useState(initial?.emails.join(', ') ?? '')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Informe o nome da administradora.')
      return
    }
    const list = parseEmails(emails)
    if (list.length === 0) {
      setError('Informe pelo menos um e-mail.')
      return
    }
    try {
      await onSubmit({ name: name.trim(), emails: list })
      if (!initial) {
        setName('')
        setEmails('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    }
  }

  return (
    <form className={own.form} onSubmit={handleSubmit}>
      <div className={styles.formRow}>
        <label className={styles.formLabel} htmlFor={`adm-name-${initial?.id ?? 'new'}`}>
          Administradora
        </label>
        <input
          id={`adm-name-${initial?.id ?? 'new'}`}
          className={styles.formInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Porto Seguro, Embracon, Rodobens"
          maxLength={80}
          disabled={isPending}
        />
      </div>
      <div className={styles.formRow}>
        <label className={styles.formLabel} htmlFor={`adm-emails-${initial?.id ?? 'new'}`}>
          E-mail(s)
        </label>
        <input
          id={`adm-emails-${initial?.id ?? 'new'}`}
          className={styles.formInput}
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="cadastro@administradora.com.br, operacional@administradora.com.br"
          disabled={isPending}
        />
        <span className={styles.formHint}>Mais de um? Separe por vírgula.</span>
      </div>
      {error && <span className={styles.formError}>{error}</span>}
      <div className={own.formActions}>
        {onCancel && (
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onCancel}
            disabled={isPending}
          >
            Cancelar
          </button>
        )}
        <button type="submit" className={styles.primaryBtn} disabled={isPending}>
          {isPending ? 'Salvando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export function AdministradorasSection() {
  const { toast } = useToast()
  const { organizationId, membership } = useActiveOrganization()
  const canManage = membership?.permissions.includes('organization.update') ?? false
  const { data, isLoading } = useAdministratorsQuery(organizationId)
  const createAdministrator = useCreateAdministrator(organizationId)
  const updateAdministrator = useUpdateAdministrator(organizationId)
  const deleteAdministrator = useDeleteAdministrator(organizationId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Administrator | null>(null)
  const items = data?.items ?? []

  async function handleRemove() {
    if (!removing) return
    try {
      await deleteAdministrator.mutateAsync(removing.id)
      toast({ type: 'success', title: `${removing.name} removida.` })
      setRemoving(null)
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível remover.',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <div className={styles.settingsContent}>
      {canManage && (
        <div className={styles.settingsCard}>
          <div className={styles.settingsCardHeader}>
            <div className={styles.settingsCardTitle}>Nova administradora</div>
            <div className={styles.settingsCardDesc}>
              Cadastre as administradoras de consórcio com que vocês trabalham. Na ficha de adesão,
              o botão "Enviar ficha pra administradora" usa estes e-mails.
            </div>
          </div>
          <div className={styles.settingsCardBody}>
            <AdministratorForm
              submitLabel="Cadastrar"
              isPending={createAdministrator.isPending}
              onSubmit={async (payload) => {
                await createAdministrator.mutateAsync(payload)
                toast({ type: 'success', title: `${payload.name} cadastrada.` })
              }}
            />
          </div>
        </div>
      )}

      <div className={styles.settingsCard}>
        <div className={styles.settingsCardHeader}>
          <div className={styles.settingsCardTitle}>Administradoras</div>
          <div className={styles.settingsCardDesc}>
            {canManage
              ? 'Aparecem como sugestão no campo "Administradora" da ficha de adesão.'
              : 'Só o Dono da organização cadastra e edita as administradoras.'}
          </div>
        </div>
        <div className={styles.settingsCardBody}>
          {isLoading ? (
            <div className={own.list}>
              <Skeleton width="100%" height={56} />
              <Skeleton width="100%" height={56} />
            </div>
          ) : items.length === 0 ? (
            <p className={own.empty}>Nenhuma administradora cadastrada ainda.</p>
          ) : (
            <ul className={own.list}>
              {items.map((item) => (
                <li key={item.id} className={own.item}>
                  {editingId === item.id ? (
                    <AdministratorForm
                      initial={item}
                      submitLabel="Salvar"
                      isPending={updateAdministrator.isPending}
                      onCancel={() => setEditingId(null)}
                      onSubmit={async (payload) => {
                        await updateAdministrator.mutateAsync({ id: item.id, payload })
                        toast({ type: 'success', title: `${payload.name} atualizada.` })
                        setEditingId(null)
                      }}
                    />
                  ) : (
                    <div className={own.row}>
                      <div className={own.info}>
                        <span className={own.name}>{item.name}</span>
                        <span className={own.emails}>{item.emails.join(' · ')}</span>
                      </div>
                      {canManage && (
                        <div className={own.rowActions}>
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={() => setEditingId(item.id)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className={styles.dangerOutlineBtn}
                            onClick={() => setRemoving(item)}
                          >
                            Remover
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {removing && (
        <Modal
          open
          onClose={() => setRemoving(null)}
          title={`Remover ${removing.name}?`}
          size="sm"
          footer={
            <div className={own.formActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setRemoving(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.dangerOutlineBtn}
                onClick={handleRemove}
                disabled={deleteAdministrator.isPending}
              >
                {deleteAdministrator.isPending ? 'Removendo…' : 'Remover'}
              </button>
            </div>
          }
        >
          <p className={own.empty}>
            As fichas de adesão que já usam este nome continuam com ele; só some da lista de
            sugestões e do envio por e-mail.
          </p>
        </Modal>
      )}
    </div>
  )
}
