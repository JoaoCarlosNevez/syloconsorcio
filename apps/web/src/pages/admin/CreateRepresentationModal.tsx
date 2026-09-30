// CreateRepresentationModal — Super Admin cria uma nova Representação (tenant).
// O dono é opcional: sem ele, só a organização é criada, e o dono entra depois
// por "Criar usuário" com o papel Dono.

import { Button, Input, Modal, useToast } from '@sylocrm/ui'
import { type FormEvent, useState } from 'react'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { useCreateRepresentation } from '../../hooks/useOrganizations'
import { buildWelcomeMessage, copyLabel } from '../../lib/welcome-message'
import styles from './AdminPage.module.css'

const initialForm = { organizationName: '', ownerName: '', ownerEmail: '' }

export interface CreateRepresentationModalProps {
  open: boolean
  onClose: () => void
}

export function CreateRepresentationModal({ open, onClose }: CreateRepresentationModalProps) {
  const [form, setForm] = useState(initialForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<{
    name: string
    email: string
    password: string
    organizationName: string | null
  } | null>(null)
  const { copiedKey, failedKey, copy } = useCopyToClipboard()
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

    const organizationName = form.organizationName.trim()
    const ownerName = form.ownerName.trim()
    const ownerEmail = form.ownerEmail.trim()
    if (!organizationName) {
      setFormError('Informe o nome da Representação.')
      return
    }
    if (Boolean(ownerName) !== Boolean(ownerEmail)) {
      setFormError('Informe nome e e-mail do dono, ou deixe os dois em branco.')
      return
    }

    try {
      const result = await createRepresentation.mutateAsync({
        organizationName,
        ...(ownerName && ownerEmail ? { ownerName, ownerEmail } : {}),
      })
      if (result.owner) {
        setCredentials({
          name: ownerName,
          email: result.owner.email,
          password: result.owner.temporaryPassword,
          organizationName: result.organization.name,
        })
        toast({ type: 'success', title: 'Representação criada com sucesso' })
      } else {
        toast({
          type: 'success',
          title: 'Representação criada sem dono',
          description: 'Adicione o dono depois em "Criar usuário", com o papel Dono.',
        })
        handleClose()
      }
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
              onClick={() => copy('password', credentials.password)}
            >
              {copyLabel('password', 'Copiar senha', copiedKey, failedKey)}
            </Button>
          </div>
        </div>
        <div className={styles.welcomeMessageBlock}>
          <span className={styles.selectLabel}>Mensagem para enviar</span>
          <pre className={styles.welcomeMessage}>{buildWelcomeMessage(credentials)}</pre>
          <Button
            type="button"
            variant="secondary"
            onClick={() => copy('message', buildWelcomeMessage(credentials))}
          >
            {copyLabel('message', 'Copiar mensagem', copiedKey, failedKey)}
          </Button>
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
          label="Nome do dono (opcional)"
          value={form.ownerName}
          onChange={(e) => updateField('ownerName', e.target.value)}
        />
        <Input
          label="E-mail do dono (opcional)"
          type="email"
          value={form.ownerEmail}
          onChange={(e) => updateField('ownerEmail', e.target.value)}
          helperText="Sem dono agora? Deixe em branco e crie depois em “Criar usuário”, com o papel Dono."
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
