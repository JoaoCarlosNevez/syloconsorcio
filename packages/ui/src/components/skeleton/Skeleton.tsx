import type { CSSProperties, HTMLAttributes } from 'react'
import styles from './Skeleton.module.css'

export type SkeletonVariant = 'text' | 'circle' | 'rect'

export interface SkeletonProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className'> {
  variant?: SkeletonVariant
  width?: CSSProperties['width']
  height?: CSSProperties['height']
}

/** Loading placeholder with shimmer animation. */
export function Skeleton({ variant = 'rect', width, height, style, ...props }: SkeletonProps) {
  return (
    <span
      className={[styles.base, styles[variant]].join(' ')}
      aria-hidden="true"
      style={{ width, height, ...style }}
      {...props}
    />
  )
}

/** Multi-line text skeleton */
export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%',
}: { lines?: number; lastLineWidth?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton lines have no unique identity
          key={i}
          variant="text"
          width={i === lines - 1 ? lastLineWidth : '100%'}
          height="0.875rem"
        />
      ))}
    </div>
  )
}

/** Card-shaped skeleton */
export function SkeletonCard({ height = '8rem' }: { height?: string }) {
  return <Skeleton variant="rect" width="100%" height={height} />
}

/** Table row skeleton with configurable columns */
export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '1rem',
        padding: '0.75rem 0',
      }}
      aria-hidden="true"
    >
      {Array.from({ length: columns }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton columns have no unique identity
        <Skeleton key={i} variant="text" height="0.875rem" />
      ))}
    </div>
  )
}
