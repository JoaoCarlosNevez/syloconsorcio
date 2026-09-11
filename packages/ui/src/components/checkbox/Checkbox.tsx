import type { InputHTMLAttributes } from 'react'
import styles from './Checkbox.module.css'

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  label?: string
  indeterminate?: boolean
}

/**
 * Checkbox with optional label.
 * 16×16px box with 4px border-radius — confirmed in Figma.
 */
export function Checkbox({ label, indeterminate = false, disabled, id, ...props }: CheckboxProps) {
  const checkboxId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <label
      className={[styles.wrapper, disabled ? styles.disabled : ''].filter(Boolean).join(' ')}
      htmlFor={checkboxId}
    >
      <input
        type="checkbox"
        id={checkboxId}
        disabled={disabled}
        className={styles.nativeInput}
        ref={(el) => {
          if (el) el.indeterminate = indeterminate
        }}
        {...props}
      />
      <span className={styles.box} aria-hidden="true">
        {indeterminate ? (
          <span className={styles.dash} />
        ) : (
          <svg className={styles.checkmark} viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path
              d="M1.5 5L4 7.5L8.5 2.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  )
}
