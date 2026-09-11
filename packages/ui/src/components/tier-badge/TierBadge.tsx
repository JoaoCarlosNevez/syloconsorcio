import type { HTMLAttributes } from 'react'
import styles from './TierBadge.module.css'

export type Tier = 'platina' | 'diamante' | 'rubi' | 'turmalina'

export interface TierBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className'> {
  tier: Tier
}

const TIER_LABELS: Record<Tier, string> = {
  platina: 'Platina',
  diamante: 'Diamante',
  rubi: 'Rubi',
  turmalina: 'Turmalina',
}

/**
 * Tier classification badge with gem dot.
 * Platina confirmed in Figma. Others are technical extensions with same token system.
 */
export function TierBadge({ tier, ...props }: TierBadgeProps) {
  return (
    <span className={[styles.badge, styles[tier]].join(' ')} {...props}>
      {TIER_LABELS[tier]}
    </span>
  )
}
