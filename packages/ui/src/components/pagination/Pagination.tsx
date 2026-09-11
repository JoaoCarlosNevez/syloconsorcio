import type { HTMLAttributes } from 'react'
import styles from './Pagination.module.css'

export interface PaginationProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  showInfo?: boolean
  siblingCount?: number
}

/**
 * Pagination control with prev/next and page buttons.
 * Collapses distant pages into ellipsis.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  showInfo = false,
  siblingCount = 1,
  ...props
}: PaginationProps) {
  const pages = buildPageRange(page, totalPages, siblingCount)

  return (
    <nav aria-label="Paginação" className={styles.root} {...props}>
      <button
        type="button"
        className={styles.button}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
      >
        <ChevronLeftIcon />
      </button>

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis entries have no unique identity
          <span key={`ellipsis-${i}`} className={styles.ellipsis} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={[styles.button, p === page ? styles.active : ''].filter(Boolean).join(' ')}
            onClick={() => onPageChange(p)}
            aria-label={`Página ${p}`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        className={styles.button}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Próxima página"
      >
        <ChevronRightIcon />
      </button>

      {showInfo && (
        <span className={styles.info}>
          {page} / {totalPages}
        </span>
      )}
    </nav>
  )
}

type PageEntry = number | 'ellipsis'

function buildPageRange(current: number, total: number, siblings: number): PageEntry[] {
  if (total <= 1) return [1]
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const left = Math.max(2, current - siblings)
  const right = Math.min(total - 1, current + siblings)

  const result: PageEntry[] = [1]
  if (left > 2) result.push('ellipsis')
  for (let i = left; i <= right; i++) result.push(i)
  if (right < total - 1) result.push('ellipsis')
  result.push(total)

  return result
}

function ChevronLeftIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
