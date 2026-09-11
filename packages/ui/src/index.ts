// UI package — shared design system and component library.
//
// Rules:
//   - Components here are purely visual — no business logic
//   - All components must be accessible (ARIA, keyboard navigation, focus management)
//   - Styling via design tokens (CSS variables) — never hardcoded colors or sizes
//   - No data fetching inside components — receive data via props

// ── Figma-confirmed components ──
export { Button } from './components/button/Button'
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/button/Button'

export { Input } from './components/input/Input'
export type { InputProps } from './components/input/Input'

export { Checkbox } from './components/checkbox/Checkbox'
export type { CheckboxProps } from './components/checkbox/Checkbox'

export { Badge } from './components/badge/Badge'
export type { BadgeProps, BadgeVariant } from './components/badge/Badge'

export { TierBadge } from './components/tier-badge/TierBadge'
export type { TierBadgeProps, Tier } from './components/tier-badge/TierBadge'

export { Avatar } from './components/avatar/Avatar'
export type { AvatarProps, AvatarSize } from './components/avatar/Avatar'

export { ProgressBar } from './components/progress-bar/ProgressBar'
export type { ProgressBarProps, ProgressBarVariant } from './components/progress-bar/ProgressBar'

export { StatusDot } from './components/status-dot/StatusDot'
export type {
  StatusDotProps,
  StatusDotStatus,
  StatusDotSize,
} from './components/status-dot/StatusDot'

export { Divider } from './components/divider/Divider'
export type { DividerProps } from './components/divider/Divider'

// ── Extension components ──
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTableRow,
} from './components/skeleton/Skeleton'
export type { SkeletonProps, SkeletonVariant } from './components/skeleton/Skeleton'

export { Tooltip } from './components/tooltip/Tooltip'
export type { TooltipProps, TooltipPosition } from './components/tooltip/Tooltip'

export { Modal } from './components/modal/Modal'
export type { ModalProps, ModalSize } from './components/modal/Modal'

export { Drawer } from './components/drawer/Drawer'
export type { DrawerProps, DrawerSide, DrawerSize } from './components/drawer/Drawer'

export { ToastProvider, useToast } from './components/toast/Toast'
export type { ToastItem, ToastType } from './components/toast/Toast'

export { Switch } from './components/switch/Switch'
export type { SwitchProps } from './components/switch/Switch'

export { Tabs } from './components/tabs/Tabs'
export type { TabsProps, TabItem } from './components/tabs/Tabs'

export { Pagination } from './components/pagination/Pagination'
export type { PaginationProps } from './components/pagination/Pagination'

export { Dropdown } from './components/dropdown/Dropdown'
export type {
  DropdownProps,
  DropdownItem,
  DropdownEntry,
  DropdownSeparator,
  DropdownLabel,
} from './components/dropdown/Dropdown'

export { EmptyState } from './components/empty-state/EmptyState'
export type { EmptyStateProps } from './components/empty-state/EmptyState'

export { DataTable } from './components/data-table/DataTable'
export type { DataTableProps, ColumnDef, SortDirection } from './components/data-table/DataTable'

// ── Patterns (composed from base components) ──
export { KpiCard } from './components/kpi-card/KpiCard'
export type { KpiCardProps, DeltaDirection } from './components/kpi-card/KpiCard'

export { ProgressCard } from './components/progress-card/ProgressCard'
export type { ProgressCardProps } from './components/progress-card/ProgressCard'

export { NavLink } from './components/nav-link/NavLink'
export type { NavLinkProps } from './components/nav-link/NavLink'

export { FilterButton } from './components/filter-button/FilterButton'
export type { FilterButtonProps } from './components/filter-button/FilterButton'
