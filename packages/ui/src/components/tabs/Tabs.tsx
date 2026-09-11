import { useId } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import styles from './Tabs.module.css'

export interface TabItem {
  key: string
  label: string
  disabled?: boolean
  content: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  activeKey: string
  onChange: (key: string) => void
}

/**
 * Accessible tab navigation using aria-selected and keyboard arrows.
 */
export function Tabs({ items, activeKey, onChange }: TabsProps) {
  const id = useId()

  function handleKey(e: KeyboardEvent<HTMLDivElement>) {
    const enabledItems = items.filter((i) => !i.disabled)
    const currentIndex = enabledItems.findIndex((i) => i.key === activeKey)

    let next = -1
    if (e.key === 'ArrowRight') next = (currentIndex + 1) % enabledItems.length
    if (e.key === 'ArrowLeft') next = (currentIndex - 1 + enabledItems.length) % enabledItems.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = enabledItems.length - 1

    if (next >= 0) {
      e.preventDefault()
      const item = enabledItems[next]
      if (item) onChange(item.key)
    }
  }

  const activeItem = items.find((i) => i.key === activeKey)

  return (
    <div className={styles.root}>
      <div role="tablist" className={styles.list} onKeyDown={handleKey}>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`${id}-tab-${item.key}`}
            aria-controls={`${id}-panel-${item.key}`}
            aria-selected={item.key === activeKey}
            disabled={item.disabled}
            tabIndex={item.key === activeKey ? 0 : -1}
            className={[
              styles.tab,
              item.key === activeKey ? styles.active : '',
              item.disabled ? styles.disabled : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => !item.disabled && onChange(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeItem && (
        <div
          role="tabpanel"
          id={`${id}-panel-${activeItem.key}`}
          aria-labelledby={`${id}-tab-${activeItem.key}`}
          className={styles.panel}
        >
          {activeItem.content}
        </div>
      )}
    </div>
  )
}
