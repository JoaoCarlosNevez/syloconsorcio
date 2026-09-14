// CreateRepresentationModal — Super Admin cria uma nova Representação (tenant).

import { Button, Input, Modal, useToast } from '@sylocrm/ui'
import { type FormEvent, useState } from 'react'
import { useCreateRepresentation } from '../../hooks/useOrganizations'
import styles from './AdminPage.module.css'

const initialForm = { organizationName: '', ownerName: '', ownerEmail: '' }

export interface CreateRepresentationModalProps {
  open: boolean
  onClose: () => void
}

export function CreateRepresentationModal({ open, onClose }: CreateRepresentationModalProps) {
  const [form, setForm] = useState(initialForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const createRepresentation = useCreateRepresentation()
  const { toast } = useToast()

  function updateField<K extends keyof typeof initialForm>(key: K, value: string) {
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

    if (!form.organizationName.trim() || !form.ownerName.trim() || !form.ownerEmail.trim()) {
      setFormError('Preencha todos os campos.')
      return
    }

    try {
      const result = await createRepresentation.mutateAsync({
        organizationName: form.organizationName.trim(),
        ownerName: form.ownerName.trim(),
        ownerEmail: form.ownerEmail.trim(),
      })
      setCredentials({ email: result.owner.email, password: result.owner.temporaryPassword })
      toast({ type: 'success', title: 'Representação criada com sucesso' })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível criar a organização',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  if (credentials) {
    return (
      <Modal open={open} onClose={handleClose} title="Representação criada" size="sm">
        <p>Compartilhe estas credenciais com o dono da representação:</p>
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
    <Modal open={open} onClose={handleClose} title="Nova Representação" size="sm">
      <form
        onSubmit={handleSubmit}
        id="create-representation-form"
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <Input
          label="Nome da Representação"
          value={form.organizationName}
          onChange={(e) => updateField('organizationName', e.target.value)}
          required
        />
        <Input
          label="Nome do dono"
          value={form.ownerName}
          onChange={(e) => updateField('ownerName', e.target.value)}
          required
        />
        <Input
          label="E-mail do dono"
          type="email"
          value={form.ownerEmail}
          onChange={(e) => updateField('ownerEmail', e.target.value)}
          required
        />
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
          form="create-representation-form"
          loading={createRepresentation.isPending}
        >
          Criar Representação
        </Button>
      </div>
    </Modal>
  )
}
