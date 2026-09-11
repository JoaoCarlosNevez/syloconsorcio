import { useEffect, useId, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Drawer.module.css'

export type DrawerSide = 'left' | 'right'
export type DrawerSize = 'sm' | 'md' | 'lg'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  side?: DrawerSide
  size?: DrawerSize
  title?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Accessible slide-in drawer panel.
 * Same accessibility guarantees as Modal: focus trap, Escape, scroll lock.
 */
export function Drawer({
  open,
  onClose,
  side = 'right',
  size = 'md',
  title,
  children,
  footer,
}: DrawerProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    focusable[0]?.focus()
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

  if (!open) return null

  return createPortal(
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: overlay closes on Escape via document-level listener registered in useEffect */}
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        // biome-ignore lint/a11y/useSemanticElements: <dialog> lacks CSS animation support for the slide-in transition
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={[styles.panel, styles[side], styles[size]].join(' ')}
        onKeyDown={handleKey}
      >
        {title && (
          <div className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Fechar painel"
            >
              <CloseIcon />
            </button>
          </div>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </>,
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
