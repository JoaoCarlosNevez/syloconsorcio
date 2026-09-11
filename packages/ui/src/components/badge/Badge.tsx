import type { HTMLAttributes } from 'react'
import styles from './Badge.module.css'

export type BadgeVariant = 'amber' | 'blue' | 'green' | 'red' | 'slate' | 'purple'

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className'> {
  variant?: BadgeVariant
  dot?: boolean
}

/**
 * Status pill badge.
 * Variants amber/blue/green confirmed in Figma.
 * Red/slate/purple are technical extensions.
 */
export function Badge({ variant = 'slate', dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[variant]].join(' ')} {...props}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  )
}
