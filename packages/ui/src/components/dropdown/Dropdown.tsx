import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import styles from './Dropdown.module.css'

export interface DropdownItem {
  key: string
  label: ReactNode
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
  onSelect?: () => void
}

export interface DropdownSeparator {
  key: string
  type: 'separator'
}

export interface DropdownLabel {
  key: string
  type: 'label'
  label: string
}

export type DropdownEntry = DropdownItem | DropdownSeparator | DropdownLabel

export interface DropdownProps {
  trigger: ReactNode
  items: DropdownEntry[]
  align?: 'left' | 'right'
}

/**
 * Accessible dropdown menu.
 * Keyboard navigation: Arrow keys move focus, Enter/Space select, Escape closes.
 */
export function Dropdown({ trigger, items, align = 'left' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const triggerId = useId()
  const menuId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Focus first item on open
  useEffect(() => {
    if (!open) return
    const first = menuRef.current?.querySelector<HTMLElement>('button:not(:disabled)')
    first?.focus()
  }, [open])

  function handleMenuKey(e: KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [],
    )
    const idx = buttons.indexOf(document.activeElement as HTMLElement)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        buttons[(idx + 1) % buttons.length]?.focus()
        break
      case 'ArrowUp':
        e.preventDefault()
        buttons[(idx - 1 + buttons.length) % buttons.length]?.focus()
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <span
        id={triggerId}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((v) => !v)
          }
        }}
        style={{ display: 'contents' }}
        tabIndex={-1}
      >
        {trigger}
      </span>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          className={[styles.menu, align === 'right' ? styles.alignRight : '']
            .filter(Boolean)
            .join(' ')}
          ref={menuRef}
          onKeyDown={handleMenuKey}
          tabIndex={-1}
        >
          {items.map((entry) => {
            if ('type' in entry && entry.type === 'separator') {
              return <div key={entry.key} className={styles.separator} aria-hidden="true" />
            }
            if ('type' in entry && entry.type === 'label') {
              return (
                <p key={entry.key} className={styles.label}>
                  {entry.label}
                </p>
              )
            }
            const item = entry as DropdownItem
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={[styles.item, item.danger ? styles.danger : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  item.onSelect?.()
                  setOpen(false)
                }}
              >
                {item.icon && <span aria-hidden="true">{item.icon}</span>}
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
