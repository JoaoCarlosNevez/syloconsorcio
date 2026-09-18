// AdminPage — painel do Super Admin: Representações (tenants) e Usuários (cross-org).
//
// Restrita a usuários com isPlatformAdmin=true (ver useCurrentUser). Não é
// um Role de Membership — é uma capacidade de nível plataforma.

import { Badge, Button, DataTable, OrganizationAvatar, Skeleton, Tabs } from '@sylocrm/ui'
import type { ColumnDef } from '@sylocrm/ui'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useOrganizationsQuery, usePlatformMembersQuery } from '../../hooks/useOrganizations'
import type { Organization, PlatformMember } from '../../lib/organizations-api'
import styles from './AdminPage.module.css'
import { CreatePlatformUserModal } from './CreatePlatformUserModal'
import { CreateRepresentationModal } from './CreateRepresentationModal'
import { DeletePlatformUserModal } from './DeletePlatformUserModal'

const TYPE_LABEL: Record<Organization['type'], string> = {
  INCORPORADORA: 'Incorporadora',
  MASTER: 'Master',
  REPRESENTACAO: 'Representação',
}

const ROLE_LABEL: Record<PlatformMember['role'], string> = {
  ADMIN: 'Dono',
  MANAGER: 'Supervisor',
  SELLER: 'Vendedor',
}

const STATUS_LABEL: Record<PlatformMember['status'], string> = {
  ACTIVE: 'Ativo',
  INVITED: 'Convidado',
  SUSPENDED: 'Desativado',
}

function RepresentacoesTab() {
  const { data, isLoading } = useOrganizationsQuery()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const navigate = useNavigate()

  const columns: ColumnDef<Organization>[] = [
    {
      key: 'icon',
      header: '',
      width: '56px',
      render: (row) => (
        <OrganizationAvatar
          id={row.id}
          name={row.name}
          iconUrl={row.isWhiteLabel ? row.branding?.iconUrl : null}
          size={32}
          className={styles.orgIcon}
        />
      ),
    },
    { key: 'name', header: 'Nome', render: (row) => row.name },
    { key: 'type', header: 'Tipo', render: (row) => TYPE_LABEL[row.type] },
  ]

  return (
    <div className={styles.tabContent}>
      <div className={styles.tabHeader}>
        <p className={styles.subtitle}>Representações cadastradas na plataforma.</p>
        <Button type="button" onClick={() => setIsCreateOpen(true)}>
          Nova Representação
        </Button>
      </div>

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

      <CreateRepresentationModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  )
}

function UsuariosTab() {
  const { data, isLoading } = usePlatformMembersQuery()
  const { data: currentUser } = useCurrentUser()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PlatformMember | null>(null)

  const columns: ColumnDef<PlatformMember>[] = [
    { key: 'name', header: 'Nome', render: (row) => row.name ?? '—' },
    { key: 'email', header: 'E-mail', render: (row) => row.email },
    {
      key: 'role',
      header: 'Papel',
      render: (row) => <Badge variant="slate">{ROLE_LABEL[row.role]}</Badge>,
    },
    { key: 'organizationName', header: 'Representação', render: (row) => row.organizationName },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'ACTIVE' ? 'green' : 'red'}>
          {STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.userId === currentUser?.id ? null : (
          <Button type="button" variant="danger" size="sm" onClick={() => setDeleteTarget(row)}>
            Apagar
          </Button>
        ),
    },
  ]

  return (
    <div className={styles.tabContent}>
      <div className={styles.tabHeader}>
        <p className={styles.subtitle}>Todos os usuários cadastrados na plataforma.</p>
        <Button type="button" onClick={() => setIsCreateOpen(true)}>
          Novo Usuário
        </Button>
      </div>

      <div className={styles.tableWrapper}>
        <DataTable
          columns={columns}
          data={data?.members ?? []}
          rowKey={(row) => row.userId}
          isLoading={isLoading}
          emptyTitle="Nenhum usuário ainda"
          emptyDescription="Crie o primeiro usuário para uma representação."
        />
      </div>

      <CreatePlatformUserModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <DeletePlatformUserModal member={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  )
}

export function AdminPage() {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<'representacoes' | 'usuarios'>('representacoes')

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
          </div>
        </header>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'representacoes' | 'usuarios')}
          items={[
            { key: 'representacoes', label: 'Representações', content: <RepresentacoesTab /> },
            { key: 'usuarios', label: 'Usuários', content: <UsuariosTab /> },
          ]}
        />
      </div>
    </AppLayout>
  )
}
