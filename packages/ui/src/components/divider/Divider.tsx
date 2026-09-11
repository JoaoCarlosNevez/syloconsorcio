import type { HTMLAttributes } from 'react'
import styles from './Divider.module.css'

export interface DividerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  label?: string
  orientation?: 'horizontal' | 'vertical'
}

/**
 * Horizontal (default) or vertical separator.
 * Optionally renders a centered text label.
 */
export function Divider({ label, orientation = 'horizontal', ...props }: DividerProps) {
  const isVertical = orientation === 'vertical'

  return (
    // biome-ignore lint/a11y/useSemanticElements: <hr> is a void element and cannot contain label children; this pattern is the standard accessible labeled divider
    // biome-ignore lint/a11y/useFocusableInteractive: separator role is not interactive and does not require focusability
    <div
      role="separator"
      aria-orientation={orientation}
      className={[styles.wrapper, isVertical ? styles.vertical : ''].filter(Boolean).join(' ')}
      {...props}
    >
      <span className={styles.line} aria-hidden="true" />
      {label && !isVertical && <span className={styles.label}>{label}</span>}
      {label && !isVertical && <span className={styles.line} aria-hidden="true" />}
    </div>
  )
}
