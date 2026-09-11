import type { HTMLAttributes, ReactNode } from 'react'
import styles from './EmptyState.module.css'

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

/**
 * Generic empty state for tables, lists, and search results.
 */
export function EmptyState({ icon, title, description, action, ...props }: EmptyStateProps) {
  return (
    <div className={styles.root} {...props}>
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
