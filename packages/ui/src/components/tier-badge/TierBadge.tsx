import type { HTMLAttributes } from 'react'
import styles from './TierBadge.module.css'
import { TIER_LABELS, type Tier } from './tiers'

export interface TierBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className'> {
  tier: Tier
}

/**
 * Badge da patente do membro (Bronze → Diamante).
 * Platina confirmada no Figma; as demais seguem o mesmo sistema de gradiente.
 */
export function TierBadge({ tier, ...props }: TierBadgeProps) {
  return (
    <span className={[styles.badge, styles[tier]].join(' ')} {...props}>
      {TIER_LABELS[tier]}
    </span>
  )
}
