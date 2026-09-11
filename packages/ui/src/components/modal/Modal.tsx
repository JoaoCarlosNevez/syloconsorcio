import { useEffect, useId, useRef } from 'react'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Modal.module.css'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  size?: ModalSize
  children: ReactNode
  footer?: ReactNode
}

/**
 * Accessible modal dialog.
 * - Focus trapped inside while open
 * - Escape key closes
 * - Scroll lock on body
 * - Rendered via portal
 */
export function Modal({ open, onClose, title, size = 'md', children, footer }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  // Scroll lock
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Focus trap: move focus into panel on open
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    first?.focus()
  }, [open])

  // Document-level Escape handler — fires regardless of which element has focus
  useEffect(() => {
    if (!open) return
    function handleDocKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleDocKey)
    return () => document.removeEventListener('keydown', handleDocKey)
  }, [open, onClose])

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose()
    if (e.key !== 'Tab') return

    const panel = panelRef.current
    if (!panel) return
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
  }

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  if (!open) return null

  return createPortal(
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      onKeyDown={handleKey}
      // biome-ignore lint/a11y/useSemanticElements: <dialog> lacks CSS animation support for this overlay transition pattern
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? titleId : undefined}
    >
      <div className={[styles.panel, styles[size]].join(' ')} ref={panelRef}>
        {title && (
          <div className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Fechar modal"
            >
              <CloseIcon />
            </button>
          </div>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
