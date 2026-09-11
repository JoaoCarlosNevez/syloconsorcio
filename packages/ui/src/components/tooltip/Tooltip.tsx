import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import styles from './Tooltip.module.css'

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: ReactNode
  position?: TooltipPosition
  children: ReactNode
  /** Delay before showing in ms */
  delay?: number
}

/**
 * Accessible tooltip using aria-describedby.
 * Keyboard accessible: shows on focus, hides on blur.
 * Respects prefers-reduced-motion via CSS.
 */
export function Tooltip({ content, position = 'top', children, delay = 100 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const id = useId()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function show() {
    timer.current = setTimeout(() => setVisible(true), delay)
  }

  function hide() {
    if (timer.current) clearTimeout(timer.current)
    setVisible(false)
  }

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      {/* Wrap children in a span that carries aria-describedby */}
      <span aria-describedby={id} style={{ display: 'contents' }}>
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={[styles.bubble, styles[position], visible ? styles.visible : '']
          .filter(Boolean)
          .join(' ')}
      >
        {content}
      </span>
    </span>
  )
}
