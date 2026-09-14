// AdminPage — painel do Super Admin: lista todas as Representações (tenants).
//
// Restrita a usuários com isPlatformAdmin=true (ver useCurrentUser). Não é
// um Role de Membership — é uma capacidade de nível plataforma.

import { Button, DataTable, Skeleton } from '@sylocrm/ui'
import type { ColumnDef } from '@sylocrm/ui'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useOrganizationsQuery } from '../../hooks/useOrganizations'
import type { Organization } from '../../lib/organizations-api'
import styles from './AdminPage.module.css'
import { CreateRepresentationModal } from './CreateRepresentationModal'

const TYPE_LABEL: Record<Organization['type'], string> = {
  INCORPORADORA: 'Incorporadora',
  MASTER: 'Master',
  REPRESENTACAO: 'Representação',
}

// Padrão de identidade visual (AGENTS.md §11): toda Representação usa a marca
// Sylo até virar White Label e definir seu próprio ícone.
const DEFAULT_ICON_URL = '/sylo-logo.png'

export function AdminPage() {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser()
  const { data, isLoading } = useOrganizationsQuery()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const navigate = useNavigate()

  const columns: ColumnDef<Organization>[] = [
    {
      key: 'icon',
      header: '',
      width: '56px',
      render: (row) => (
        <img src={row.branding?.iconUrl ?? DEFAULT_ICON_URL} alt="" className={styles.orgIcon} />
      ),
    },
    { key: 'name', header: 'Nome', render: (row) => row.name },
    { key: 'type', header: 'Tipo', render: (row) => TYPE_LABEL[row.type] },
  ]

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
      <div className={styles.page} style={{ maxWidth: 'none' }}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Administração</h1>
            <p className={styles.subtitle}>Representações cadastradas na plataforma.</p>
          </div>
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            Nova Representação
          </Button>
        </header>

        <div className={styles.tableWrapper}>
          <DataTable
            columns={columns}
            data={data?.organizations ?? []}
            rowKey={(row) => row.id}
            isLoading={isLoading}
            emptyTitle="Nenhuma representação ainda"
            emptyDescription="Crie a primeira representação para começar."
            onRowClick={(row) => navigate(`/app/admin/${row.id}`)}
          />
        </div>
      </div>

      <CreateRepresentationModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </AppLayout>
  )
}
