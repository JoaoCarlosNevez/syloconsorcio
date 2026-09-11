import type { InputHTMLAttributes } from 'react'
import styles from './Switch.module.css'

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  label?: string
}

/**
 * Toggle switch. Keyboard accessible via Space.
 */
export function Switch({ label, disabled, id, ...props }: SwitchProps) {
  const switchId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <label
      className={[styles.wrapper, disabled ? styles.disabled : ''].filter(Boolean).join(' ')}
      htmlFor={switchId}
    >
      <input
        type="checkbox"
        // biome-ignore lint/a11y/useAriaPropsForRole: aria-checked is provided by the native checkbox checked attribute spread via {...props}
        role="switch"
        id={switchId}
        disabled={disabled}
        className={styles.nativeInput}
        {...props}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  )
}
