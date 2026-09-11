import type { HTMLAttributes, ReactNode } from 'react'
import { ProgressBar } from '../progress-bar/ProgressBar'
import type { ProgressBarVariant } from '../progress-bar/ProgressBar'
import styles from './ProgressCard.module.css'

export interface ProgressCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  title: string
  value: number
  badge?: ReactNode
  variant?: ProgressBarVariant
  showValue?: boolean
}

/**
 * Card with a labeled progress bar — confirmed pattern in Figma Home screen.
 */
export function ProgressCard({
  title,
  value,
  badge,
  variant = 'green',
  showValue = true,
  ...props
}: ProgressCardProps) {
  return (
    <div className={styles.card} {...props}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {badge && <span className={styles.badge}>{badge}</span>}
      </div>
      <ProgressBar value={value} showValue={showValue} variant={variant} />
    </div>
  )
}
