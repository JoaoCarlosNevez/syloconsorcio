// AdminPage — Super Admin cria novas Representações (tenants).
//
// Restrita a usuários com isPlatformAdmin=true (ver useCurrentUser). Não é
// um Role de Membership — é uma capacidade de nível plataforma.

import { Button, Input, Skeleton, useToast } from '@sylocrm/ui'
import { type FormEvent, useState } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { createRepresentation } from '../../lib/organizations-api'
import styles from './AdminPage.module.css'

const initialForm = { organizationName: '', ownerName: '', ownerEmail: '' }

export function AdminPage() {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser()
  const [form, setForm] = useState(initialForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const { toast } = useToast()

  function updateField<K extends keyof typeof initialForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!form.organizationName.trim() || !form.ownerName.trim() || !form.ownerEmail.trim()) {
      setFormError('Preencha todos os campos.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createRepresentation({
        organizationName: form.organizationName.trim(),
        ownerName: form.ownerName.trim(),
        ownerEmail: form.ownerEmail.trim(),
      })
      setCredentials({ email: result.owner.email, password: result.owner.temporaryPassword })
      setForm(initialForm)
      toast({ type: 'success', title: 'Representação criada com sucesso' })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível criar a organização',
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingUser) {
    return (
      <AppLayout>
        <div className={styles.page}>
          <Skeleton variant="text" width="240px" height="28px" />
          <Skeleton variant="rect" width="100%" height="280px" style={{ borderRadius: 16 }} />
        </div>
      </AppLayout>
    )
  }

  if (!currentUser?.isPlatformAdmin) {
    return (
      <AppLayout>
        <div className={styles.denied}>Esta área é restrita ao Super Admin da plataforma.</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className={styles.page}>
        <div>
          <h1 className={styles.title}>Administração</h1>
          <p className={styles.subtitle}>Crie uma nova Representação e defina o dono da conta.</p>
        </div>

        <div className={styles.card}>
          {credentials ? (
            <>
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
              <Button type="button" onClick={() => setCredentials(null)}>
                Criar outra representação
              </Button>
            </>
          ) : (
            <form
              onSubmit={handleSubmit}
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
              <Button type="submit" loading={isSubmitting}>
                Criar Representação
              </Button>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
