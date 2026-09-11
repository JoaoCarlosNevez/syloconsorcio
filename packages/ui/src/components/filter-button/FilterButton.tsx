import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './FilterButton.module.css'

export interface FilterButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  icon?: ReactNode
  active?: boolean
  count?: number
}

/**
 * Filter toggle button with optional active state and count badge.
 * Confirmed pattern in Figma table/list screens.
 */
export function FilterButton({
  children,
  icon,
  active = false,
  count,
  ...props
}: FilterButtonProps) {
  return (
    <button
      type="button"
      className={[styles.button, active ? styles.active : ''].filter(Boolean).join(' ')}
      aria-pressed={active}
      {...props}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
      {count !== undefined && count > 0 && (
        <span className={styles.count} aria-label={`${count} filtros ativos`}>
          {count}
        </span>
      )}
    </button>
  )
}
