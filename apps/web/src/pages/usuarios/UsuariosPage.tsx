// UsuariosPage — gestão de equipe da organização ativa.
//
// ADMIN convida Supervisor (MANAGER) ou Vendedor (SELLER).
// Supervisor (MANAGER) convida só Vendedor.
// Vendedor (SELLER) só visualiza a equipe — sem permissão de convite.

import { Badge, Button, DataTable, Input, Modal, useToast } from '@sylocrm/ui'
import type { ColumnDef } from '@sylocrm/ui'
import { type FormEvent, useState } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import { useActiveOrganization } from '../../hooks/useOrganization'
import { useInviteTeamMember, useTeamMembersQuery } from '../../hooks/useTeam'
import type { InvitableRole, TeamMember } from '../../lib/team-api'
import styles from './UsuariosPage.module.css'

const ROLE_LABEL: Record<TeamMember['role'], string> = {
  ADMIN: 'Dono',
  MANAGER: 'Supervisor',
  SELLER: 'Vendedor',
}

// Um Role só convida papéis estritamente abaixo do seu (AGENTS.md §7,
// espelhado no backend por canGrantRole).
const INVITABLE_ROLES_BY_ROLE: Record<string, InvitableRole[]> = {
  ADMIN: ['MANAGER', 'SELLER'],
  MANAGER: ['SELLER'],
  SELLER: [],
}

function InviteMemberModal({
  open,
  organizationId,
  invitableRoles,
  onClose,
}: {
  open: boolean
  organizationId: string
  invitableRoles: InvitableRole[]
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InvitableRole>(invitableRoles[0] ?? 'SELLER')
  const [formError, setFormError] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const inviteMember = useInviteTeamMember(organizationId)
  const { toast } = useToast()

  function handleClose() {
    setName('')
    setEmail('')
    setFormError(null)
    setCredentials(null)
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!name.trim() || !email.trim()) {
      setFormError('Preencha nome e e-mail.')
      return
    }

    try {
      const result = await inviteMember.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        role,
      })
      setCredentials({ email: email.trim(), password: result.member.temporaryPassword })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível convidar este membro',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  if (credentials) {
    return (
      <Modal open={open} onClose={handleClose} title="Membro criado" size="sm">
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
    <Modal open={open} onClose={handleClose} title="Convidar membro" size="sm">
      <form onSubmit={handleSubmit} className={styles.formGrid} id="invite-member-form">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <span className={styles.selectLabel}>Papel</span>
        <select
          className={styles.select}
          value={role}
          onChange={(e) => setRole(e.target.value as InvitableRole)}
        >
          {invitableRoles.map((option) => (
            <option key={option} value={option}>
              {ROLE_LABEL[option]}
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
        <Button type="submit" form="invite-member-form" loading={inviteMember.isPending}>
          Convidar
        </Button>
      </div>
    </Modal>
  )
}

export function UsuariosPage() {
  const { organizationId, membership } = useActiveOrganization()
  const { data, isLoading } = useTeamMembersQuery(organizationId)
  const [isInviteOpen, setIsInviteOpen] = useState(false)

  const invitableRoles = membership ? (INVITABLE_ROLES_BY_ROLE[membership.role] ?? []) : []
  const canInvite = invitableRoles.length > 0

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

  return (
    <AppLayout>
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Usuários</h1>
          {canInvite && (
            <Button type="button" onClick={() => setIsInviteOpen(true)}>
              Convidar membro
            </Button>
          )}
        </header>

        <div className={styles.tableWrapper}>
          <DataTable
            columns={columns}
            data={data?.members ?? []}
            rowKey={(row) => row.userId}
            isLoading={isLoading}
            emptyTitle="Nenhum membro ainda"
            emptyDescription="Convide supervisores e vendedores para a sua equipe."
          />
        </div>
      </div>

      {organizationId && canInvite && (
        <InviteMemberModal
          open={isInviteOpen}
          organizationId={organizationId}
          invitableRoles={invitableRoles}
          onClose={() => setIsInviteOpen(false)}
        />
      )}
    </AppLayout>
  )
}
