import type { ImgHTMLAttributes } from 'react'
import type { Tier } from '../tier-badge/TierBadge'
import styles from './Avatar.module.css'

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'className'> {
  /** Displayed when image fails or src is absent */
  initials?: string
  size?: AvatarSize
  tier?: Tier
  showStatus?: boolean
}

/**
 * Circular avatar with optional tier gradient ring and status dot.
 * Sizes: 36px sidebar (sm), 112px hero (xl) — confirmed in Figma.
 */
export function Avatar({
  src,
  alt = '',
  initials,
  size = 'md',
  tier,
  showStatus = false,
  ...props
}: AvatarProps) {
  // biome-ignore lint/a11y/useAltText: alt is provided via the alt prop (defaults to '') or initials fallback
  const imgEl = src ? <img src={src} alt={alt} className={styles.img} {...props} /> : null

  return (
    <span className={[styles.root, styles[size]].join(' ')}>
      {imgEl ?? (
        <span className={styles.fallback} aria-label={alt || initials}>
          {initials ?? '?'}
        </span>
      )}

      {tier && <span className={[styles.tierRing, styles[tier]].join(' ')} aria-hidden="true" />}
      {showStatus && <span className={styles.statusDot} aria-hidden="true" />}
    </span>
  )
}
