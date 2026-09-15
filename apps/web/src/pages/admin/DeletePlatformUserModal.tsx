// DeletePlatformUserModal — Super Admin apaga a conta de uma pessoa da
// plataforma inteira (login + todos os vínculos com organizações).
// Irreversível — ver DeletePlatformUserUseCase pro que exatamente é apagado.

import { Button, Modal, useToast } from '@sylocrm/ui'
import { useDeletePlatformUser } from '../../hooks/useOrganizations'
import type { PlatformMember } from '../../lib/organizations-api'
import styles from './AdminPage.module.css'

export interface DeletePlatformUserModalProps {
  member: PlatformMember | null
  onClose: () => void
}

export function DeletePlatformUserModal({ member, onClose }: DeletePlatformUserModalProps) {
  const deletePlatformUser = useDeletePlatformUser()
  const { toast } = useToast()

  async function handleConfirm() {
    if (!member) return
    try {
      await deletePlatformUser.mutateAsync(member.userId)
      toast({ type: 'success', title: 'Usuário apagado da plataforma' })
      onClose()
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível apagar o usuário',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <Modal open={member !== null} onClose={onClose} title="Apagar usuário" size="sm">
      <p>
        Tem certeza que deseja apagar <strong>{member?.name ?? member?.email}</strong> da
        plataforma? A pessoa perde o login e todos os vínculos com organizações. Essa ação não pode
        ser desfeita.
      </p>
      <div className={styles.modalActions}>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="danger"
          loading={deletePlatformUser.isPending}
          onClick={handleConfirm}
        >
          Apagar
        </Button>
      </div>
    </Modal>
  )
}
