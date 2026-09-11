import type { ReactNode } from 'react'
import { EmptyState } from '../empty-state/EmptyState'
import { SkeletonTableRow } from '../skeleton/Skeleton'
import styles from './DataTable.module.css'

export type SortDirection = 'asc' | 'desc'

export interface ColumnDef<T> {
  key: string
  header: string
  sortable?: boolean
  render: (row: T, index: number) => ReactNode
  width?: string
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  rowKey: (row: T) => string
  isLoading?: boolean
  error?: string | null
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  sortKey?: string
  sortDirection?: SortDirection
  onSort?: (key: string) => void
  selectedKeys?: Set<string>
  skeletonRows?: number
}

/**
 * Data table with loading skeleton, empty state, error state, sorting, and row selection.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  error = null,
  emptyTitle = 'Nenhum resultado',
  emptyDescription,
  emptyAction,
  sortKey,
  sortDirection,
  onSort,
  selectedKeys,
  skeletonRows = 5,
}: DataTableProps<T>) {
  const colCount = columns.length

  return (
    <div className={styles.wrapper}>
      <table className={styles.table} aria-busy={isLoading}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={[styles.th, col.sortable ? styles.sortable : '']
                  .filter(Boolean)
                  .join(' ')}
                style={col.width ? { width: col.width } : undefined}
                aria-sort={
                  sortKey === col.key
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : col.sortable
                      ? 'none'
                      : undefined
                }
                onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                onKeyDown={
                  col.sortable && onSort
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSort(col.key)
                        }
                      }
                    : undefined
                }
                tabIndex={col.sortable ? 0 : undefined}
              >
                {col.header}
                {col.sortable && (
                  <span
                    className={[styles.sortIcon, sortKey === col.key ? styles.active : '']
                      .filter(Boolean)
                      .join(' ')}
                    aria-hidden="true"
                  >
                    <SortIcon active={sortKey === col.key} direction={sortDirection} />
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading &&
            Array.from({ length: skeletonRows }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows have no unique identity
              <tr key={`skeleton-${i}`} className={styles.tr}>
                <td colSpan={colCount} className={styles.stateCell}>
                  <SkeletonTableRow columns={colCount} />
                </td>
              </tr>
            ))}

          {!isLoading && error && (
            <tr className={styles.tr}>
              <td colSpan={colCount}>
                <EmptyState title="Erro ao carregar dados" description={error} />
              </td>
            </tr>
          )}

          {!isLoading && !error && data.length === 0 && (
            <tr className={styles.tr}>
              <td colSpan={colCount}>
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  action={emptyAction}
                />
              </td>
            </tr>
          )}

          {!isLoading &&
            !error &&
            data.map((row, rowIndex) => {
              const key = rowKey(row)
              return (
                <tr
                  key={key}
                  className={[styles.tr, selectedKeys?.has(key) ? styles.selected : '']
                    .filter(Boolean)
                    .join(' ')}
                  aria-selected={selectedKeys ? selectedKeys.has(key) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={styles.td}>
                      {col.render(row, rowIndex)}
                    </td>
                  ))}
                </tr>
              )
            })}
        </tbody>
      </table>
    </div>
  )
}

function SortIcon({ active, direction }: { active: boolean; direction?: SortDirection }) {
  if (!active) {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="7 15 12 20 17 15" />
        <polyline points="7 9 12 4 17 9" />
      </svg>
    )
  }
  return direction === 'asc' ? (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="7 9 12 4 17 9" />
    </svg>
  ) : (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="7 15 12 20 17 15" />
    </svg>
  )
}
