import { type InputHTMLAttributes, useState } from 'react'
import styles from './Input.module.css'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string
  helperText?: string
  errorMessage?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  /** When true, shows a password toggle icon. Overrides rightIcon. */
  passwordToggle?: boolean
}

/**
 * Text / password input field.
 * Confirmed in Figma: email field, password field with eye toggle.
 * Label uses uppercase + letter-spacing 0.6px pattern from design.
 */
export function Input({
  label,
  helperText,
  errorMessage,
  leftIcon,
  rightIcon,
  passwordToggle = false,
  type,
  id,
  disabled,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const hasError = Boolean(errorMessage)
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const resolvedType = passwordToggle ? (showPassword ? 'text' : 'password') : type

  const inputClassNames = [
    styles.input,
    hasError ? styles.error : '',
    !leftIcon ? styles.noLeftIcon : '',
    passwordToggle || rightIcon ? styles.hasRightIcon : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}

      <div className={styles.inputWrapper}>
        {leftIcon && (
          <span className={styles.iconLeft} aria-hidden="true">
            {leftIcon}
          </span>
        )}

        <input
          id={inputId}
          type={resolvedType ?? 'text'}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          className={inputClassNames}
          {...props}
        />

        {passwordToggle ? (
          <button
            type="button"
            className={styles.iconRight}
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            tabIndex={0}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        ) : (
          rightIcon && (
            <span className={styles.iconRight} aria-hidden="true">
              {rightIcon}
            </span>
          )
        )}
      </div>

      {hasError && (
        <span id={`${inputId}-error`} role="alert" className={styles.errorMessage}>
          {errorMessage}
        </span>
      )}

      {!hasError && helperText && (
        <span id={`${inputId}-helper`} className={styles.helperText}>
          {helperText}
        </span>
      )}
    </div>
  )
}

function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}
