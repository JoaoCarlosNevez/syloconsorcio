// FunnelsSection — CRUD de funis (pipelines) e seus estágios, dentro de
// Configurações > Organização. Leitura livre pra qualquer membership; criar/
// editar/excluir exige organization.update (mesma trava de leadSegments/
// leadSources/leadTags nesta mesma tela — só ADMIN).
//
// Reordenar estágios usa o mesmo padrão @dnd-kit do Kanban (DndContext +
// SortableContext vertical + useSortable + arrayMove), sem DragOverlay nem
// multi-coluna — overkill pra uma lista vertical simples.

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useToast } from '@sylocrm/ui'
import { useState } from 'react'
import {
  useCreateFunnel,
  useDeleteFunnel,
  useFunnelsQuery,
  useUpdateFunnel,
} from '../../hooks/useFunnels'
import { useActiveOrganization } from '../../hooks/useOrganization'
import type { Funnel, FunnelStage } from '../../lib/funnels-api'
import styles from './ConfigPage.module.css'

// ── Ícones ────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function GripIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
      <circle cx="2" cy="2" r="1.5" />
      <circle cx="8" cy="2" r="1.5" />
      <circle cx="2" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="2" cy="14" r="1.5" />
      <circle cx="8" cy="14" r="1.5" />
    </svg>
  )
}

// ── Tipos e constantes ───────────────────────────────────────────────────────

const COLOR_PALETTE = [
  '#94a3b8',
  '#f59e0b',
  '#8b5cf6',
  '#f43f5e',
  '#0ea5e9',
  '#10b981',
  '#ec4899',
  '#64748b',
]

interface StageDraft {
  /** Chave estável só pro React (nunca enviada à API). */
  tempKey: string
  /** Presente = estágio existente; ausente = novo, ainda não salvo. */
  id?: string
  name: string
  color: string
  /** Só presente em estágios existentes — vem do GET /funnels. */
  leadCount?: number
}

function stageDraftsFromFunnel(funnel: Funnel): StageDraft[] {
  return funnel.stages.map((stage) => ({
    tempKey: stage.id,
    id: stage.id,
    name: stage.name,
    color: stage.color,
    leadCount: stage.leadCount,
  }))
}

// ── Estágio arrastável ───────────────────────────────────────────────────────

function SortableStageRow({
  stage,
  onChangeName,
  onChangeColor,
  onRemove,
}: {
  stage: StageDraft
  onChangeName: (name: string) => void
  onChangeColor: (color: string) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.tempKey,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const hasLeads = (stage.leadCount ?? 0) > 0

  return (
    <div ref={setNodeRef} style={style} className={styles.stageEditorRow}>
      <button
        type="button"
        className={styles.stageDragHandle}
        aria-label="Reordenar estágio"
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      <input
        className={styles.formInput}
        value={stage.name}
        onChange={(e) => onChangeName(e.target.value)}
        placeholder="Nome do estágio"
      />
      <div className={styles.colorSwatchRow}>
        {COLOR_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            className={color === stage.color ? styles.colorSwatchActive : styles.colorSwatch}
            style={{ background: color }}
            aria-label={`Cor ${color}`}
            onClick={() => onChangeColor(color)}
          />
        ))}
      </div>
      <button
        type="button"
        className={styles.segmentTagRemove}
        onClick={onRemove}
        disabled={hasLeads}
        title={
          hasLeads
            ? `${stage.leadCount} lead(s) neste estágio — mova-os antes de remover.`
            : undefined
        }
        aria-label={`Remover estágio ${stage.name}`}
      >
        <XIcon />
      </button>
    </div>
  )
}

// ── Editor de um funil (nome + estágios) ─────────────────────────────────────

function FunnelEditor({
  funnel,
  otherFunnels,
  onClose,
}: {
  funnel: Funnel
  /** Demais funis da org — opções pro gatilho "passar o bastão". */
  otherFunnels: Funnel[]
  onClose: () => void
}) {
  const { organizationId } = useActiveOrganization()
  const updateFunnel = useUpdateFunnel(organizationId)
  const { toast } = useToast()

  const [name, setName] = useState(funnel.name)
  const [stages, setStages] = useState<StageDraft[]>(() => stageDraftsFromFunnel(funnel))
  const [duplicateToFunnelId, setDuplicateToFunnelId] = useState(funnel.duplicateToFunnelId ?? '')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    setStages((prev) => {
      const fromIdx = prev.findIndex((s) => s.tempKey === active.id)
      const toIdx = prev.findIndex((s) => s.tempKey === over.id)
      if (fromIdx === -1 || toIdx === -1) return prev
      return arrayMove(prev, fromIdx, toIdx)
    })
  }

  function updateStage(tempKey: string, changes: Partial<StageDraft>) {
    setStages((prev) => prev.map((s) => (s.tempKey === tempKey ? { ...s, ...changes } : s)))
  }

  function removeStage(tempKey: string) {
    setStages((prev) => prev.filter((s) => s.tempKey !== tempKey))
  }

  function addStage() {
    setStages((prev) => [
      ...prev,
      { tempKey: crypto.randomUUID(), name: '', color: COLOR_PALETTE[0] as string },
    ])
  }

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast({ type: 'error', title: 'Dê um nome ao funil.' })
      return
    }
    if (stages.length === 0) {
      toast({ type: 'error', title: 'O funil precisa de ao menos um estágio.' })
      return
    }
    if (stages.some((s) => !s.name.trim())) {
      toast({ type: 'error', title: 'Todo estágio precisa de um nome.' })
      return
    }
    try {
      await updateFunnel.mutateAsync({
        id: funnel.id,
        payload: {
          name: trimmedName,
          stages: stages.map((s) => ({ id: s.id, name: s.name.trim(), color: s.color })),
          duplicateToFunnelId: duplicateToFunnelId || null,
        },
      })
      toast({ type: 'success', title: 'Funil salvo com sucesso' })
      onClose()
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível salvar o funil',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <div className={styles.stageEditorBox}>
      <div className={styles.formRow}>
        <label className={styles.formLabel} htmlFor={`funnel-name-${funnel.id}`}>
          Nome do funil
        </label>
        <input
          id={`funnel-name-${funnel.id}`}
          className={styles.formInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className={styles.formRow}>
        <span className={styles.formLabel}>Estágios (ordem do funil)</span>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={stages.map((s) => s.tempKey)}
            strategy={verticalListSortingStrategy}
          >
            {stages.map((stage) => (
              <SortableStageRow
                key={stage.tempKey}
                stage={stage}
                onChangeName={(value) => updateStage(stage.tempKey, { name: value })}
                onChangeColor={(value) => updateStage(stage.tempKey, { color: value })}
                onRemove={() => removeStage(stage.tempKey)}
              />
            ))}
          </SortableContext>
        </DndContext>
        <button type="button" className={styles.secondaryBtn} onClick={addStage}>
          <PlusIcon /> Adicionar Estágio
        </button>
      </div>

      <div className={styles.formRow}>
        <label className={styles.formLabel} htmlFor={`funnel-duplicate-${funnel.id}`}>
          Ao marcar Ganho neste funil, duplicar automaticamente para
        </label>
        <select
          id={`funnel-duplicate-${funnel.id}`}
          className={styles.formSelect}
          value={duplicateToFunnelId}
          onChange={(e) => setDuplicateToFunnelId(e.target.value)}
        >
          <option value="">Nenhum (padrão)</option>
          {otherFunnels.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.saveRow}>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={handleSave}
          disabled={updateFunnel.isPending}
        >
          Salvar
        </button>
        <button type="button" className={styles.secondaryBtn} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Seção principal ──────────────────────────────────────────────────────────

export function FunnelsSection({ isAdmin }: { isAdmin: boolean }) {
  const { organizationId } = useActiveOrganization()
  const { data, isLoading } = useFunnelsQuery(organizationId)
  const createFunnel = useCreateFunnel(organizationId)
  const deleteFunnel = useDeleteFunnel(organizationId)
  const updateFunnel = useUpdateFunnel(organizationId)
  const { toast } = useToast()

  const [editingFunnelId, setEditingFunnelId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newFunnelName, setNewFunnelName] = useState('')

  const funnels = data?.funnels ?? []

  async function handleCreateFunnel() {
    const trimmed = newFunnelName.trim()
    if (!trimmed) {
      toast({ type: 'error', title: 'Dê um nome ao novo funil.' })
      return
    }
    try {
      const funnel = await createFunnel.mutateAsync({
        name: trimmed,
        stages: [{ name: 'Lead', color: COLOR_PALETTE[0] as string }],
      })
      toast({ type: 'success', title: 'Funil criado — agora personalize os estágios' })
      setNewFunnelName('')
      setIsCreating(false)
      setEditingFunnelId(funnel.id)
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível criar o funil',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  async function handleSetDefault(funnelId: string) {
    try {
      await updateFunnel.mutateAsync({ id: funnelId, payload: { isDefault: true } })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível definir o funil padrão',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  async function handleDelete(funnel: Funnel) {
    try {
      await deleteFunnel.mutateAsync(funnel.id)
      toast({ type: 'success', title: 'Funil excluído' })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Não foi possível excluir o funil',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  function totalLeads(funnel: Funnel) {
    return funnel.stages.reduce((sum, s: FunnelStage) => sum + (s.leadCount ?? 0), 0)
  }

  return (
    <div className={styles.settingsCard}>
      <div className={styles.settingsCardHeader}>
        <div className={styles.settingsCardTitle}>Funis</div>
        <div className={styles.settingsCardDesc}>
          {isAdmin
            ? 'Pipelines de vendas — cada um com seus próprios estágios. O Kanban mostra um funil por vez.'
            : 'Apenas o dono da representação pode editar os funis.'}
        </div>
      </div>
      <div className={styles.settingsCardBody}>
        {isLoading ? (
          <p className={styles.segmentEmpty}>Carregando…</p>
        ) : (
          funnels.map((funnel) => (
            <div key={funnel.id} className={styles.funnelListRow}>
              <div className={styles.funnelListInfo}>
                <span className={styles.funnelListName}>{funnel.name}</span>
                {funnel.isDefault && <span className={styles.funnelBadgeDefault}>Padrão</span>}
                <span className={styles.funnelLeadCount}>{totalLeads(funnel)} lead(s)</span>
              </div>
              {isAdmin && (
                <div className={styles.funnelListActions}>
                  {!funnel.isDefault && (
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => handleSetDefault(funnel.id)}
                      disabled={updateFunnel.isPending}
                    >
                      Definir como padrão
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() =>
                      setEditingFunnelId(editingFunnelId === funnel.id ? null : funnel.id)
                    }
                  >
                    {editingFunnelId === funnel.id ? 'Fechar' : 'Editar'}
                  </button>
                  <button
                    type="button"
                    className={styles.dangerOutlineBtn}
                    onClick={() => handleDelete(funnel)}
                    disabled={
                      deleteFunnel.isPending ||
                      funnel.isDefault ||
                      funnels.length <= 1 ||
                      totalLeads(funnel) > 0
                    }
                    title={
                      funnel.isDefault
                        ? 'Defina outro funil como padrão antes de excluir este.'
                        : funnels.length <= 1
                          ? 'A organização precisa ter ao menos um funil.'
                          : totalLeads(funnel) > 0
                            ? 'Este funil ainda tem leads.'
                            : undefined
                    }
                  >
                    Excluir
                  </button>
                </div>
              )}
              {editingFunnelId === funnel.id && (
                <FunnelEditor
                  funnel={funnel}
                  otherFunnels={funnels.filter((f) => f.id !== funnel.id)}
                  onClose={() => setEditingFunnelId(null)}
                />
              )}
            </div>
          ))
        )}

        {isAdmin &&
          (isCreating ? (
            <div className={styles.stageEditorBox}>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="new-funnel-name">
                  Nome do novo funil
                </label>
                <input
                  id="new-funnel-name"
                  className={styles.formInput}
                  value={newFunnelName}
                  onChange={(e) => setNewFunnelName(e.target.value)}
                  placeholder="Ex: Imobiliário, Consórcio Pesado…"
                />
              </div>
              <div className={styles.saveRow}>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={handleCreateFunnel}
                  disabled={createFunnel.isPending}
                >
                  Criar funil
                </button>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => {
                    setIsCreating(false)
                    setNewFunnelName('')
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setIsCreating(true)}
            >
              <PlusIcon /> Novo Funil
            </button>
          ))}
      </div>
    </div>
  )
}
