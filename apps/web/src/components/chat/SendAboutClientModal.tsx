// SendAboutClientModal — "Mandar pra alguém" de dentro da ficha do cliente:
// escolhe a pessoa e escreve; a mensagem vai pra conversa direta entre os
// dois, com o cliente anexado (o outro abre a ficha com um clique).

import { Button, Modal, useToast } from '@sylocrm/ui'
import { type FormEvent, useMemo, useState } from 'react'
import { useSendDirectAboutLead } from '../../hooks/useChat'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useTeamMembersQuery } from '../../hooks/useTeam'
import styles from './ChatThread.module.css'

export interface SendAboutClientModalProps {
  organizationId: string
  leadId: string
  leadName: string
  onClose: () => void
}

export function SendAboutClientModal({
  organizationId,
  leadId,
  leadName,
  onClose,
}: SendAboutClientModalProps) {
  const { toast } = useToast()
  const { data: currentUser } = useCurrentUser()
  const { data: teamData } = useTeamMembersQuery(organizationId)
  const send = useSendDirectAboutLead(organizationId)
  const people = useMemo(
    () =>
      (teamData?.members ?? []).filter(
        (member) => member.status === 'ACTIVE' && member.userId !== currentUser?.id,
      ),
    [teamData, currentUser?.id],
  )
  const [userId, setUserId] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!userId) {
      setError('Escolha pra quem mandar.')
      return
    }
    if (!body.trim()) {
      setError('Escreva a mensagem.')
      return
    }
    send.mutate(
      { userId, leadId, body: body.trim() },
      {
        onSuccess: () => {
          const person = people.find((member) => member.userId === userId)
          const name = person?.name ?? person?.email ?? 'a pessoa'
          toast({
            type: 'success',
            title: `Mensagem enviada pra ${name}`,
            description: 'A conversa fica no Chat, com o cliente anexado.',
          })
          onClose()
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Não foi possível enviar.'),
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Mandar pra alguém"
      size="sm"
      footer={
        <div className={styles.modalActions}>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="send-about-client-form" loading={send.isPending}>
            Enviar
          </Button>
        </div>
      }
    >
      <form id="send-about-client-form" className={styles.form} onSubmit={submit}>
        <div className={styles.leadChip}>
          <span className={styles.leadChipLabel}>Cliente</span>
          <span className={styles.leadChipName}>{leadName}</span>
        </div>
        <label className={styles.field}>
          Pra quem
          <select
            className={styles.fieldInput}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">Escolha uma pessoa</option>
            {people.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name ?? member.email}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Mensagem
          <textarea
            className={styles.fieldInput}
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ex: Consegue ver se o RG dele está legível?"
            maxLength={4000}
          />
        </label>
        <span className={styles.hint}>
          Vai pra conversa direta entre vocês dois, com o cliente anexado.
        </span>
        {error && <span className={styles.formError}>{error}</span>}
      </form>
    </Modal>
  )
}
