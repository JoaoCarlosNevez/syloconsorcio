// AdminOrganizationDetailPage — detalhe de uma Representação no painel do
// Super Admin: editar nome, definir ícone, ver a equipe.
//
// Restrita a isPlatformAdmin=true, igual à AdminPage (lista).

import {
  Badge,
  Button,
  DataTable,
  Input,
  OrganizationAvatar,
  Skeleton,
  Switch,
  useToast,
} from '@sylocrm/ui'
import type { ColumnDef } from '@sylocrm/ui'
import { type ChangeEvent, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import {
  useOrganizationMembersQuery,
  useOrganizationsQuery,
  useUpdateOrganization,
  useUploadOrganizationIcon,
} from '../../hooks/useOrganizations'
import { validateIconFile } from '../../lib/icon-validation'
import type { TeamMember } from '../../lib/team-api'
import styles from './AdminPage.module.css'

const ROLE_LABEL: Record<TeamMember['role'], string> = {
  ADMIN: 'Dono',
  MANAGER: 'Supervisor',
  SELLER: 'Vendedor',
}

export function AdminOrganizationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser()
  const { data: orgsData, isLoading: isLoadingOrgs } = useOrganizationsQuery()
  const { data: membersData, isLoading: isLoadingMembers } = useOrganizationMembersQuery(id ?? null)
  const updateOrganization = useUpdateOrganization(id ?? '')
  const uploadIcon = useUploadOrganizationIcon(id ?? '')
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  const organization = orgsData?.organizations.find((org) => org.id === id)

  function startEditingName() {
    setNameDraft(organization?.name ?? '')
    setIsEditingName(true)
  }

  async function saveName() {
    if (!nameDraft.trim()) return
    try {
      await updateOrganization.mutateAsync({ name: nameDraft.trim() })
      setIsEditingName(false)
      toast({ type: 'success', title: 'Nome atualizado' })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível atualizar o nome',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  async function toggleWhiteLabel(checked: boolean) {
    try {
      await updateOrganization.mutateAsync({ isWhiteLabel: checked })
      toast({
        type: 'success',
        title: checked ? 'White Label ativado' : 'White Label desativado',
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível atualizar o White Label',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  async function handleIconChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const validationError = await validateIconFile(file)
    if (validationError) {
      toast({
        type: 'error',
        title: 'Não foi possível usar essa imagem',
        description: validationError,
      })
      return
    }

    try {
      await uploadIcon.mutateAsync(file)
      toast({ type: 'success', title: 'Ícone atualizado' })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível enviar o ícone',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  const columns: ColumnDef<TeamMember>[] = [
    { key: 'name', header: 'Nome', render: (row) => row.name ?? '—' },
    { key: 'email', header: 'E-mail', render: (row) => row.email },
    {
      key: 'role',
      header: 'Papel',
      render: (row) => <Badge variant="slate">{ROLE_LABEL[row.role]}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (row.status === 'ACTIVE' ? 'Ativo' : row.status),
    },
  ]

  if (isLoadingUser) {
    return (
      <AppLayout>
        <div className={styles.page} style={{ maxWidth: 'none' }}>
          <Skeleton variant="text" width="240px" height="28px" />
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
      <div className={styles.page} style={{ maxWidth: 'none' }}>
        <Link to="/app/admin" className={styles.backLink}>
          ← Voltar para Administração
        </Link>

        {isLoadingOrgs ? (
          <Skeleton variant="rect" width="100%" height="80px" style={{ borderRadius: 16 }} />
        ) : !organization ? (
          <p>Organização não encontrada.</p>
        ) : (
          <>
            <div className={styles.detailHeader}>
              <button
                type="button"
                className={styles.iconUpload}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Alterar ícone da representação"
              >
                <OrganizationAvatar
                  id={organization.id}
                  name={organization.name}
                  iconUrl={organization.isWhiteLabel ? organization.branding?.iconUrl : null}
                  size={54}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className={styles.iconUploadInput}
                  onChange={handleIconChange}
                />
              </button>

              <div>
                <div style={{ marginBottom: 8 }}>
                  <Switch
                    label={`White Label ${organization.isWhiteLabel ? '(ativado)' : '(desativado)'}`}
                    checked={organization.isWhiteLabel}
                    onChange={(e) => toggleWhiteLabel(e.target.checked)}
                    disabled={updateOrganization.isPending}
                  />
                </div>

                {isEditingName ? (
                  <div className={styles.nameEditRow}>
                    <Input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      aria-label="Nome da representação"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={saveName}
                      loading={updateOrganization.isPending}
                    >
                      Salvar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setIsEditingName(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className={styles.nameEditRow}>
                    <h1 className={styles.title}>{organization.name}</h1>
                    <Button type="button" size="sm" variant="ghost" onClick={startEditingName}>
                      Editar nome
                    </Button>
                  </div>
                )}
                <p className={styles.subtitle}>{organization.type}</p>
              </div>
            </div>

            <h2 className={styles.sectionTitle}>Equipe</h2>
            <div className={styles.tableWrapper}>
              <DataTable
                columns={columns}
                data={membersData?.members ?? []}
                rowKey={(row) => row.userId}
                isLoading={isLoadingMembers}
                emptyTitle="Nenhum membro ainda"
              />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
