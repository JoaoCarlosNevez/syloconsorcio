// ComingSoonPage — tela cheia, sem sidebar.
// X fecha sem votar. Voto positivo fecha. Voto negativo abre modal de comentário.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './ComingSoonPage.module.css'

// ── Ícones ────────────────────────────────────────────────────────────────────

function ThumbsUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
    </svg>
  )
}

function ThumbsDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

// ── ComingSoonPage ─────────────────────────────────────────────────────────────

export function ComingSoonPage() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [comment, setComment]     = useState('')

  function close() { navigate(-1) }

  function handleVote(v: 'up' | 'down') {
    // TODO: enviar voto para API
    if (v === 'up') {
      close()
    } else {
      setShowModal(true)
    }
  }

  function handleSendComment() {
    // TODO: enviar comentário para API
    close()
  }

  return (
    <div className={styles.page}>

      {/* ── Botão fechar ─────────────────────────────────────────────────── */}
      <button
        type="button"
        className={styles.closeBtn}
        onClick={close}
        aria-label="Fechar"
      >
        <XIcon />
      </button>

      {/* ── Conteúdo — sobreposto ao background ──────────────────────────── */}
      <div className={styles.content}>
        <h1 className={styles.title}>Estamos construindo algo novo.</h1>

        <p className={styles.question}>Essa funcionalidade seria útil para você?</p>

        <div className={styles.buttons}>
          <button type="button" className={styles.voteBtn} onClick={() => handleVote('up')}>
            <ThumbsUpIcon />
            Sim, seria útil
          </button>
          <button type="button" className={styles.voteBtn} onClick={() => handleVote('down')}>
            <ThumbsDownIcon />
            Não vejo necessidade
          </button>
        </div>
      </div>

      {/* ── Modal de comentário (voto negativo) ──────────────────────────── */}
      {showModal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className={styles.modal}>
            <h2 id="modal-title" className={styles.modalTitle}>Quer nos contar mais?</h2>
            <p className={styles.modalSubtitle}>
              Seu comentário nos ajuda a entender o que realmente importa para você.
            </p>
            <textarea
              className={styles.modalTextarea}
              placeholder="O que você precisaria que essa funcionalidade fizesse? (opcional)"
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalSkipBtn} onClick={close}>
                Sair sem comentar
              </button>
              <button type="button" className={styles.modalSendBtn} onClick={handleSendComment}>
                Enviar feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
