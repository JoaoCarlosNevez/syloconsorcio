// CreateLeadModal — formulário mínimo de criação de lead.
// Sem lógica de negócio aqui além de validação de formulário — a criação em
// si (organizationId, permissões) é resolvida pelo backend.

import { Button, Input, Modal, useToast } from '@sylocrm/ui'
import { type FormEvent, useState } from 'react'
import { useCreateLead } from '../../hooks/useLeads'

export interface CreateLeadModalProps {
  open: boolean
  organizationId: string
  onClose: () => void
}

const SOURCE_OPTIONS = ['FACEBOOK', 'INSTAGRAM', 'INDICAÇÃO', 'SITE'] as const

const initialForm = {
  name: '',
  phone: '',
  segment: '',
  value: '',
  quotaCount: '1',
  source: SOURCE_OPTIONS[0] as string,
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
    if (!form.name.trim() || !form.phone.trim() || !form.segment.trim() || valueCents === null) {
      setFormError('Preencha nome, telefone, segmento e um valor de cota válido.')
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
        <Input
          label="Segmento"
          placeholder="Imobiliário, Auto, Pesado…"
          value={form.segment}
          onChange={(e) => updateField('segment', e.target.value)}
          required
        />
        <Input
          label="Valor da cota (R$)"
          placeholder="350000"
          inputMode="decimal"
          value={form.value}
          onChange={(e) => updateField('value', e.target.value)}
          required
        />
        <Input
          label="Quantidade de cotas"
          type="number"
          min={1}
          value={form.quotaCount}
          onChange={(e) => updateField('quotaCount', e.target.value)}
        />
        <label
          htmlFor="lead-source"
          style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}
        >
          Origem
        </label>
        <select
          id="lead-source"
          value={form.source}
          onChange={(e) => updateField('source', e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border, #ccc)' }}
        >
          {SOURCE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
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
        <Button type="submit" form="create-lead-form" loading={createLead.isPending}>
          Criar lead
        </Button>
      </div>
    </Modal>
  )
}
