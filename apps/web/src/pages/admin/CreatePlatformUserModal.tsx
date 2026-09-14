// CreatePlatformUserModal — Super Admin cria um usuário com qualquer Role
// (incluindo ADMIN) em qualquer Representação existente.

import { Button, Input, Modal, useToast } from '@sylocrm/ui'
import { type FormEvent, useState } from 'react'
import { useCreatePlatformUser, useOrganizationsQuery } from '../../hooks/useOrganizations'
import type { CreatePlatformUserPayload } from '../../lib/organizations-api'
import styles from './AdminPage.module.css'

const ROLE_LABEL: Record<CreatePlatformUserPayload['role'], string> = {
  ADMIN: 'Dono (ADMIN)',
  MANAGER: 'Supervisor',
  SELLER: 'Vendedor',
}

const initialForm = { organizationId: '', name: '', email: '', role: 'SELLER' as const }

export interface CreatePlatformUserModalProps {
  open: boolean
  onClose: () => void
}

export function CreatePlatformUserModal({ open, onClose }: CreatePlatformUserModalProps) {
  const [form, setForm] = useState<CreatePlatformUserPayload>(initialForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const { data: organizationsData } = useOrganizationsQuery()
  const createPlatformUser = useCreatePlatformUser()
  const { toast } = useToast()

  const organizations = organizationsData?.organizations ?? []

  function updateField<K extends keyof CreatePlatformUserPayload>(
    key: K,
    value: CreatePlatformUserPayload[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleClose() {
    setForm(initialForm)
    setFormError(null)
    setCredentials(null)
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!form.organizationId || !form.name.trim() || !form.email.trim()) {
      setFormError('Preencha todos os campos.')
      return
    }

    try {
      const result = await createPlatformUser.mutateAsync({
        organizationId: form.organizationId,
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      })
      setCredentials({ email: form.email.trim(), password: result.member.temporaryPassword })
      toast({ type: 'success', title: 'Usuário criado com sucesso' })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível criar o usuário',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  if (credentials) {
    return (
      <Modal open={open} onClose={handleClose} title="Usuário criado" size="sm">
        <p>Compartilhe estas credenciais com a pessoa — elas só aparecem uma vez:</p>
        <div className={styles.credentialsBox}>
          <div className={styles.credentialsRow}>
            <span>{credentials.email}</span>
          </div>
          <div className={styles.credentialsRow}>
            <span>{credentials.password}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigator.clipboard.writeText(credentials.password)}
            >
              Copiar senha
            </Button>
          </div>
        </div>
        <div className={styles.modalActions}>
          <Button type="button" onClick={handleClose}>
            Concluir
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Novo Usuário" size="sm">
      <form onSubmit={handleSubmit} id="create-platform-user-form" className={styles.formGrid}>
        <span className={styles.selectLabel}>Representação</span>
        <select
          className={styles.select}
          value={form.organizationId}
          onChange={(e) => updateField('organizationId', e.target.value)}
        >
          <option value="">Selecione…</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        <Input
          label="Nome"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          required
        />
        <Input
          label="E-mail"
          type="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          required
        />
        <span className={styles.selectLabel}>Papel</span>
        <select
          className={styles.select}
          value={form.role}
          onChange={(e) => updateField('role', e.target.value as CreatePlatformUserPayload['role'])}
        >
          {(Object.keys(ROLE_LABEL) as CreatePlatformUserPayload['role'][]).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role]}
            </option>
          ))}
        </select>
        {formError && (
          <span role="alert" className={styles.formError}>
            {formError}
          </span>
        )}
      </form>
      <div className={styles.modalActions}>
        <Button type="button" variant="secondary" onClick={handleClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="create-platform-user-form"
          loading={createPlatformUser.isPending}
        >
          Criar Usuário
        </Button>
      </div>
    </Modal>
  )
}
