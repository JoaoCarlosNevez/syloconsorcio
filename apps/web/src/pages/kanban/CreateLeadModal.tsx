// CreateLeadModal — formulário mínimo de criação de lead.
// Sem lógica de negócio aqui além de validação de formulário — a criação em
// si (organizationId, permissões) é resolvida pelo backend.

import { Button, Input, Modal, useToast } from '@sylocrm/ui'
import { type FormEvent, useState } from 'react'
import { useCreateLead } from '../../hooks/useLeads'
import { useOrganizationSettingsQuery } from '../../hooks/useOrganizationSettings'
import { useTeamMembersQuery } from '../../hooks/useTeam'

export interface CreateLeadModalProps {
  open: boolean
  organizationId: string
  onClose: () => void
}

const initialForm = {
  name: '',
  phone: '',
  segment: '',
  value: '',
  quotaCount: '1',
  source: '',
  assignedUserId: '',
}

function parseValueToCents(value: string): number | null {
  // Aceita "350000", "350.000" ou "350000,50" — sempre BRL.
  const normalized = value.replace(/\./g, '').replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  if (Number.isNaN(parsed) || parsed <= 0) return null
  return Math.round(parsed * 100)
}

export function CreateLeadModal({ open, organizationId, onClose }: CreateLeadModalProps) {
  const [form, setForm] = useState(initialForm)
  const [formError, setFormError] = useState<string | null>(null)
  const createLead = useCreateLead(organizationId)
  const { data: teamData } = useTeamMembersQuery(organizationId)
  const members = teamData?.members ?? []
  const { data: settingsData } = useOrganizationSettingsQuery(organizationId)
  const leadSegments = settingsData?.organization.leadSegments ?? []
  const leadSources = settingsData?.organization.leadSources ?? []
  const { toast } = useToast()

  function updateField<K extends keyof typeof initialForm>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleClose() {
    setForm(initialForm)
    setFormError(null)
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const valueCents = parseValueToCents(form.value)
    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.segment.trim() ||
      !form.source.trim() ||
      valueCents === null
    ) {
      setFormError('Preencha nome, telefone, segmento, origem e um valor de cota válido.')
      return
    }

    try {
      await createLead.mutateAsync({
        name: form.name.trim(),
        phone: form.phone.trim(),
        segment: form.segment.trim(),
        valueCents,
        quotaCount: Math.max(1, Number.parseInt(form.quotaCount, 10) || 1),
        source: form.source,
        assignedUserId: form.assignedUserId || null,
      })
      toast({ type: 'success', title: 'Lead criado com sucesso' })
      handleClose()
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível criar o lead',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Novo Lead" size="sm">
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        id="create-lead-form"
      >
        <Input
          label="Nome"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          required
        />
        <Input
          label="Telefone"
          placeholder="(11) 90000-0000"
          value={form.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          required
        />
        <label
          htmlFor="lead-segment"
          style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}
        >
          Segmento
        </label>
        {leadSegments.length > 0 ? (
          <select
            id="lead-segment"
            value={form.segment}
            onChange={(e) => updateField('segment', e.target.value)}
            required
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border, #ccc)',
            }}
          >
            <option value="" disabled>
              Selecione…
            </option>
            {leadSegments.map((segment) => (
              <option key={segment} value={segment}>
                {segment}
              </option>
            ))}
          </select>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--color-text-muted, #64748b)' }}>
            Nenhum tipo de crédito cadastrado. Configure em Configurações → Organização antes de
            criar um lead.
          </span>
        )}
        <Input
          label="Valor do crédito (R$)"
          placeholder="350000"
          inputMode="decimal"
          value={form.value}
          onChange={(e) => updateField('value', e.target.value.replace(/[^0-9.,]/g, ''))}
          required
        />
        <Input
          label="Quantidade de cotas"
          type="number"
          min={1}
          value={form.quotaCount}
          onChange={(e) => updateField('quotaCount', e.target.value.replace(/[^0-9]/g, ''))}
        />
        <label
          htmlFor="lead-source"
          style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}
        >
          Origem
        </label>
        {leadSources.length > 0 ? (
          <select
            id="lead-source"
            value={form.source}
            onChange={(e) => updateField('source', e.target.value)}
            required
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border, #ccc)',
            }}
          >
            <option value="" disabled>
              Selecione…
            </option>
            {leadSources.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--color-text-muted, #64748b)' }}>
            Nenhuma origem cadastrada. Configure em Configurações → Organização antes de criar um
            lead.
          </span>
        )}
        <label
          htmlFor="lead-assignee"
          style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}
        >
          Atribuir a
        </label>
        <select
          id="lead-assignee"
          value={form.assignedUserId}
          onChange={(e) => updateField('assignedUserId', e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border, #ccc)' }}
        >
          <option value="">Não atribuído</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.name ?? member.email}
            </option>
          ))}
        </select>
        {formError && (
          <span role="alert" style={{ color: 'var(--color-danger, #dc2626)', fontSize: 13 }}>
            {formError}
          </span>
        )}
      </form>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Button type="button" variant="secondary" onClick={handleClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="create-lead-form"
          loading={createLead.isPending}
          disabled={leadSegments.length === 0 || leadSources.length === 0}
        >
          Criar lead
        </Button>
      </div>
    </Modal>
  )
}
