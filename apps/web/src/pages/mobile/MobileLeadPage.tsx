// Ficha do lead no celular: ligar/WhatsApp, etapa do funil, registrar
// ligação e visita, reenviar a proposta, histórico com comentário e
// ganho/perdido. Nos funis ADM e Pós-venda, o checklist (e a parcela
// pagou/não pagou) no lugar de ganho/perdido; pra Dono, Supervisor e ADM, a
// troca de responsável. A ficha de adesão completa e os documentos ficam no web.

import { Skeleton } from '@sylocrm/ui'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { type CallResult, useMobileLead } from '../../hooks/useMobileLead'
import type { LeadProposal } from '../../lib/leads-api'
import { LOST_REASONS, formatMoney, telLink, whatsappLink } from '../../lib/mobile'
import { describeProposalViews } from '../../lib/proposal-share'
import styles from './Mobile.module.css'
import { BackBar, Sheet, useToast } from './MobileUi'
import { TaskRow } from './TaskRow'
import { PhoneIcon, ShareIcon, TickIcon, UsersIcon, WhatsappIcon } from './icons'

const ROLE_LABEL = {
  ADMIN: 'Dono',
  MANAGER: 'Supervisor',
  BACKOFFICE: 'ADM',
  SELLER: 'Vendedor',
} as const

type SheetState =
  | { kind: 'call' }
  | { kind: 'stage' }
  | { kind: 'lost'; reason: string | null }
  | { kind: 'share'; proposal: LeadProposal; url: string }
  | { kind: 'won' }
  | { kind: 'assign' }

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Depois de tocar em Ligar, a volta pro app (o discador fecha) abre a
 * pergunta "como foi?". */
function useReturnFromCall(onReturn: () => void) {
  const pending = useRef(false)
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible' && pending.current) {
        pending.current = false
        onReturn()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [onReturn])
  return () => {
    pending.current = true
  }
}

export function MobileLeadPage() {
  const { id = '' } = useParams()
  const m = useMobileLead(id)
  const toast = useToast()
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [scheduleReturn, setScheduleReturn] = useState(false)
  const [comment, setComment] = useState('')
  const armCall = useReturnFromCall(() => setSheet({ kind: 'call' }))

  const lead = m.lead.data
  if (m.lead.isLoading) {
    return (
      <main className={styles.content}>
        <BackBar />
        <Skeleton width="100%" height={120} />
        <Skeleton width="100%" height={48} />
        <Skeleton width="100%" height={90} />
      </main>
    )
  }
  if (!lead) {
    return (
      <main className={styles.content}>
        <BackBar />
        <p className={styles.empty}>
          Não deu pra abrir este lead. Ele pode ter passado pra outra pessoa.
        </p>
      </main>
    )
  }

  const closed = Boolean(lead.wonAt || lead.lostAt)
  const checklist = m.checklist.data
  const stage = m.stages[m.stageIndex]
  const proposals = m.proposals.data?.proposals ?? []
  const firstName = lead.name.split(' ')[0] ?? lead.name

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action()
      setSheet(null)
      toast.show(success)
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Não deu certo. Tente de novo.')
    }
  }

  async function onCallResult(result: CallResult) {
    await run(
      () => m.registerCall(result, scheduleReturn),
      scheduleReturn ? 'Ligação registrada e retorno marcado' : 'Ligação registrada',
    )
    setScheduleReturn(false)
  }

  async function openShare(proposal: LeadProposal) {
    try {
      const url = await m.proposalLink(proposal.id, proposal.shareToken)
      setSheet({ kind: 'share', proposal, url })
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Não deu pra gerar o link.')
    }
  }

  async function onComment(event: FormEvent) {
    event.preventDefault()
    const text = comment.trim()
    if (!text) return
    await run(() => m.addComment(text), 'Anotação salva')
    setComment('')
  }

  const historyItems = [
    ...(m.history.data?.comments ?? []).map((c) => ({ id: c.id, text: c.text, at: c.createdAt })),
    ...(m.history.data?.stageChanges ?? []).map((s) => ({
      id: s.id,
      text: `Etapa: ${s.fromStage ?? '—'} → ${s.toStage ?? '—'}`,
      at: s.changedAt,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <main className={styles.content}>
      <BackBar fallback="/m/leads" />

      <section className={`${styles.card} ${styles.hero}`}>
        <p className={styles.eyebrow}>
          {lead.segment} · origem {lead.source}
        </p>
        <h1 className={styles.title}>{lead.name}</h1>
        <div className={styles.phoneNumber}>{lead.phone}</div>
        <div className={styles.meta}>
          <span className={styles.pill}>{formatMoney(lead.valueCents)}</span>
          {lead.wonAt && <span className={`${styles.pill} ${styles.pillWon}`}>Ganho</span>}
          {lead.lostAt && <span className={`${styles.pill} ${styles.pillLost}`}>Perdido</span>}
        </div>
      </section>

      <div className={styles.two}>
        <a
          href={telLink(lead.phone)}
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={armCall}
        >
          <PhoneIcon />
          Ligar
        </a>
        <a
          href={whatsappLink(lead.phone)}
          target="_blank"
          rel="noreferrer"
          className={`${styles.btn} ${styles.btnWhatsapp}`}
        >
          <WhatsappIcon />
          WhatsApp
        </a>
      </div>

      {m.canAssign && (
        <section className={styles.card}>
          <div className={styles.row}>
            <div className={styles.grow}>
              <span className={styles.statLabel}>Responsável</span>
              <span className={styles.rowTitle}>
                {m.assigneeName(lead.assignedUserId) ?? 'Sem responsável'}
              </span>
            </div>
            {!closed && (
              <button
                type="button"
                className={styles.link}
                onClick={() => setSheet({ kind: 'assign' })}
              >
                Trocar
              </button>
            )}
          </div>
        </section>
      )}

      {m.stages.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Etapa · {m.funnel?.name}</h2>
          <div className={styles.card}>
            <div
              className={styles.stepper}
              style={{ gridTemplateColumns: `repeat(${m.stages.length}, 1fr)` }}
            >
              {m.stages.map((s, i) => (
                <div
                  key={s.id}
                  className={`${styles.step} ${i <= m.stageIndex && !lead.lostAt ? styles.stepDone : ''}`}
                />
              ))}
            </div>
            <div className={styles.stepperLabel}>
              <b>{lead.lostAt ? 'Perdido' : (stage?.name ?? '—')}</b>
              {!closed && (
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => setSheet({ kind: 'stage' })}
                >
                  Mudar etapa
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {!closed && (
        <section>
          <h2 className={styles.sectionTitle}>Registrar</h2>
          <div className={styles.two}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              disabled={m.isSaving}
              onClick={() => setSheet({ kind: 'call' })}
            >
              <PhoneIcon />
              Ligação feita
            </button>
            {!m.isSystemFunnel && (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                disabled={m.isSaving}
                onClick={() => run(m.registerVisit, 'Visita registrada')}
              >
                <UsersIcon size={18} />
                Visita feita
              </button>
            )}
          </div>
        </section>
      )}

      {m.isSystemFunnel && (
        <section>
          <h2 className={styles.sectionTitle}>Checklist</h2>
          {checklist?.pendingPayment && (
            <div className={`${styles.card} ${styles.pushCard}`}>
              <b>{checklist.pendingPayment.title}</b>
              <p className={styles.note}>
                Venceu em {new Date(checklist.pendingPayment.dueAt).toLocaleDateString('pt-BR')}. O
                cliente pagou?
              </p>
              <div className={styles.two}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnLine}`}
                  disabled={m.isAnsweringPayment}
                  onClick={() => run(() => m.answerPayment(false), 'Marcado como atrasado')}
                >
                  Não pagou
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={m.isAnsweringPayment}
                  onClick={() => run(() => m.answerPayment(true), 'Pagamento registrado')}
                >
                  Pagou
                </button>
              </div>
            </div>
          )}
          <div className={`${styles.card} ${styles.list}`}>
            {m.checklist.isLoading ? (
              <div className={styles.row}>
                <Skeleton width="100%" height={36} />
              </div>
            ) : (
              checklist?.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={styles.checkItem}
                  disabled={m.isTogglingChecklist}
                  onClick={() =>
                    run(
                      () => m.toggleChecklistItem({ itemKey: item.key, checked: !item.checked }),
                      item.checked ? 'Item desmarcado' : 'Item marcado',
                    )
                  }
                >
                  <span className={`${styles.check} ${item.checked ? styles.checkOn : ''}`}>
                    {item.checked ? <TickIcon /> : null}
                  </span>
                  <span className={styles.grow}>{item.label}</span>
                </button>
              ))
            )}
          </div>
        </section>
      )}

      {proposals.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Proposta</h2>
          <div className={styles.list}>
            {proposals.map((proposal) => {
              const views = describeProposalViews(proposal)
              return (
                <div key={proposal.id} className={`${styles.card} ${styles.proposal}`}>
                  <div className={styles.values}>
                    <div>
                      Crédito<strong>{formatMoney(lead.valueCents)}</strong>
                    </div>
                    <div>
                      Prazo<strong>{proposal.termMonths} meses</strong>
                    </div>
                    <div>
                      Entrada<strong>{formatMoney(proposal.downPaymentCents)}</strong>
                    </div>
                  </div>
                  <p className={styles.note}>{views ?? 'Link ainda não enviado ao cliente'}</p>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnLine}`}
                    onClick={() => openShare(proposal)}
                  >
                    <ShareIcon />
                    {proposal.shareToken ? 'Reenviar link da proposta' : 'Enviar link da proposta'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {(m.openTasks.data?.items.length ?? 0) > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Próximas tarefas</h2>
          <div className={`${styles.card} ${styles.list}`}>
            {m.openTasks.data?.items.map((task) => (
              <TaskRow key={task.id} task={task} now={new Date()} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className={styles.sectionTitle}>Histórico</h2>
        <div className={styles.card}>
          <div className={styles.history}>
            {m.history.isLoading ? (
              <Skeleton width="100%" height={40} />
            ) : historyItems.length === 0 ? (
              <p className={styles.note}>Nada registrado ainda.</p>
            ) : (
              historyItems.slice(0, 15).map((item) => (
                <div key={item.id} className={styles.historyItem}>
                  <i />
                  <div>
                    {item.text}
                    <small>{formatWhen(item.at)}</small>
                  </div>
                </div>
              ))
            )}
          </div>
          <form className={styles.commentForm} onSubmit={onComment}>
            <input
              className={styles.input}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Anotar algo sobre a conversa…"
              aria-label="Anotação"
            />
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnGhost}`}
              disabled={m.isCommenting || !comment.trim()}
            >
              Salvar
            </button>
          </form>
        </div>
      </section>

      {!closed && !m.isSystemFunnel && (
        <div className={styles.two}>
          <button
            type="button"
            className={`${styles.link} ${styles.linkDanger}`}
            onClick={() => setSheet({ kind: 'lost', reason: null })}
          >
            Marcar como perdido
          </button>
          <button type="button" className={styles.link} onClick={() => setSheet({ kind: 'won' })}>
            Venda fechada
          </button>
        </div>
      )}

      {sheet?.kind === 'call' && (
        <Sheet onClose={() => setSheet(null)}>
          <h3>Como foi a ligação com {firstName}?</h3>
          <p className={styles.note}>Fica no histórico do lead e conta na sua ofensiva.</p>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={scheduleReturn}
              onChange={(event) => setScheduleReturn(event.target.checked)}
            />
            Criar tarefa de retorno pra amanhã, 10h
          </label>
          <div className={styles.two}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnLine}`}
              disabled={m.isSaving}
              onClick={() => onCallResult('nao_atendeu')}
            >
              Não atendeu
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={m.isSaving}
              onClick={() => onCallResult('atendeu')}
            >
              Atendeu
            </button>
          </div>
          <button type="button" className={styles.link} onClick={() => setSheet(null)}>
            Não registrar
          </button>
        </Sheet>
      )}

      {sheet?.kind === 'stage' && (
        <Sheet onClose={() => setSheet(null)}>
          <h3>Mudar etapa</h3>
          <div className={styles.options}>
            {m.stages.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`${styles.option} ${s.id === lead.stageId ? styles.optionOn : ''}`}
                disabled={m.isSaving}
                onClick={() => run(() => m.moveToStage(s.id), `Movido pra ${s.name}`)}
              >
                {s.name}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {sheet?.kind === 'assign' && (
        <Sheet onClose={() => setSheet(null)}>
          <h3>Passar {firstName} pra quem?</h3>
          <div className={styles.options}>
            {m.assignees.map((member) => (
              <button
                key={member.userId}
                type="button"
                className={`${styles.option} ${member.userId === lead.assignedUserId ? styles.optionOn : ''}`}
                disabled={m.isSaving}
                onClick={() =>
                  run(() => m.assignTo(member.userId), `Agora com ${member.name ?? member.email}`)
                }
              >
                {member.name ?? member.email}
                <small>{ROLE_LABEL[member.role]}</small>
              </button>
            ))}
            <button
              type="button"
              className={styles.option}
              disabled={m.isSaving || !lead.assignedUserId}
              onClick={() => run(() => m.assignTo(null), 'Lead sem responsável')}
            >
              Sem responsável
            </button>
          </div>
        </Sheet>
      )}

      {sheet?.kind === 'won' && (
        <Sheet onClose={() => setSheet(null)}>
          <h3>Fechou a venda com {firstName}?</h3>
          <p className={styles.note}>
            O lead vira Ganho e uma cópia vai pro funil ADM, como no computador.
          </p>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={m.isSaving}
            onClick={() => run(m.markWon, 'Venda registrada')}
          >
            Marcar como ganho
          </button>
        </Sheet>
      )}

      {sheet?.kind === 'lost' && (
        <Sheet onClose={() => setSheet(null)}>
          <h3>Por que {firstName} foi perdido?</h3>
          <div className={styles.options}>
            {LOST_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                className={`${styles.option} ${sheet.reason === reason ? styles.optionOn : ''}`}
                onClick={() => setSheet({ kind: 'lost', reason })}
              >
                {reason}
              </button>
            ))}
          </div>
          <p className={styles.note}>Só o gestor consegue reabrir um lead perdido.</p>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger}`}
            disabled={!sheet.reason || m.isSaving}
            onClick={() =>
              sheet.reason &&
              run(() => m.markLost(sheet.reason as string), 'Lead marcado como perdido')
            }
          >
            Marcar como perdido
          </button>
        </Sheet>
      )}

      {sheet?.kind === 'share' && (
        <Sheet onClose={() => setSheet(null)}>
          <h3>Enviar proposta</h3>
          <p className={styles.note}>Quando o cliente abrir o link, você recebe um aviso.</p>
          <div className={`${styles.card} ${styles.proposal}`}>{sheet.url}</div>
          <div className={styles.two}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnLine}`}
              onClick={() =>
                navigator.clipboard
                  .writeText(sheet.url)
                  .then(() => toast.show('Link copiado'))
                  .catch(() => toast.show('Não deu pra copiar'))
              }
            >
              Copiar link
            </button>
            <a
              href={whatsappLink(lead.phone, `Oi ${firstName}! Segue sua proposta: ${sheet.url}`)}
              target="_blank"
              rel="noreferrer"
              className={`${styles.btn} ${styles.btnWhatsapp}`}
            >
              <WhatsappIcon />
              WhatsApp
            </a>
          </div>
        </Sheet>
      )}

      {toast.node}
    </main>
  )
}
