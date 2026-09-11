import type { HTMLAttributes } from 'react'
import styles from './ProgressBar.module.css'

export type ProgressBarVariant = 'green' | 'amber' | 'blue' | 'red'

export interface ProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  /** 0–100 */
  value: number
  label?: string
  showValue?: boolean
  variant?: ProgressBarVariant
}

/**
 * Progress bar with track and animated fill.
 * Track: bg-subtle. Fill: green gradient — confirmed in Figma for team progress.
 */
export function ProgressBar({
  value,
  label,
  showValue = false,
  variant = 'green',
  ...props
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className={styles.wrapper} {...props}>
      {(label || showValue) && (
        <div className={styles.header}>
          {label && <span className={styles.label}>{label}</span>}
          {showValue && <span className={styles.value}>{clamped}%</span>}
        </div>
      )}
      <div
        className={styles.track}
        role="progressbar"
        tabIndex={0}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={[styles.fill, variant !== 'green' ? styles[variant] : '']
            .filter(Boolean)
            .join(' ')}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
