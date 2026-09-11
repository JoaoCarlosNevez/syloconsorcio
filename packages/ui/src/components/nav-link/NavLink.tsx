import type { AnchorHTMLAttributes, ReactNode } from 'react'
import styles from './NavLink.module.css'

export interface NavLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> {
  icon?: ReactNode
  label: string
  active?: boolean
  badge?: ReactNode
}

/**
 * Sidebar navigation link.
 * Dark sidebar background assumed — colors set for dark context.
 * Confirmed in Figma sidebar design.
 */
export function NavLink({ icon, label, active = false, badge, ...props }: NavLinkProps) {
  return (
    <a
      className={[styles.link, active ? styles.active : ''].filter(Boolean).join(' ')}
      aria-current={active ? 'page' : undefined}
      {...props}
    >
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={styles.label}>{label}</span>
      {badge && <span className={styles.badge}>{badge}</span>}
    </a>
  )
}
