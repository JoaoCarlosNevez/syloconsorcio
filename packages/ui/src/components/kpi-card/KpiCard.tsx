import type { HTMLAttributes, ReactNode } from 'react'
import styles from './KpiCard.module.css'

export type DeltaDirection = 'positive' | 'negative' | 'neutral'

export interface KpiCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  label: string
  value: string | number
  icon?: ReactNode
  delta?: string
  deltaDirection?: DeltaDirection
  footer?: string
}

/**
 * KPI metric card — confirmed pattern in Figma Home screen.
 */
export function KpiCard({
  label,
  value,
  icon,
  delta,
  deltaDirection = 'neutral',
  footer,
  ...props
}: KpiCardProps) {
  return (
    <div className={styles.card} {...props}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        {icon && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className={styles.value}>{value}</div>
      {delta && (
        <div className={[styles.delta, styles[deltaDirection]].join(' ')}>
          {deltaDirection === 'positive' && <span aria-hidden="true">↑</span>}
          {deltaDirection === 'negative' && <span aria-hidden="true">↓</span>}
          {delta}
        </div>
      )}
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  )
}
