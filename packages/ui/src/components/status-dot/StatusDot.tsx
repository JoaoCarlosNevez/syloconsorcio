import type { HTMLAttributes } from 'react'
import styles from './StatusDot.module.css'

export type StatusDotStatus = 'online' | 'busy' | 'offline'
export type StatusDotSize = 'sm' | 'md' | 'lg'

export interface StatusDotProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className'> {
  status?: StatusDotStatus
  size?: StatusDotSize
  pulse?: boolean
}

const STATUS_LABELS: Record<StatusDotStatus, string> = {
  online: 'Online',
  busy: 'Ocupado',
  offline: 'Offline',
}

/**
 * Presence indicator dot with optional pulse animation.
 * Emerald color + pulse animation confirmed in Figma.
 */
export function StatusDot({
  status = 'online',
  size = 'md',
  pulse = false,
  ...props
}: StatusDotProps) {
  const dotClasses = [styles.dot, styles[status], pulse ? styles.pulse : '']
    .filter(Boolean)
    .join(' ')

  return (
    <span
      className={[styles.wrapper, size !== 'md' ? styles[size] : ''].filter(Boolean).join(' ')}
      // biome-ignore lint/a11y/useSemanticElements: <output> has different display characteristics; span with role="status" is the correct pattern here
      role="status"
      aria-label={STATUS_LABELS[status]}
      {...props}
    >
      <span className={dotClasses} aria-hidden="true" />
    </span>
  )
}
