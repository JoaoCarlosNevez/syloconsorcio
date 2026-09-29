/**
 * SyloCRM 2.0 — Design Tokens (TypeScript mirror)
 *
 * Source of truth: /docs/design-system.md (Figma audit)
 * These constants mirror the CSS custom properties in ./index.css.
 * Use when you need token values in JavaScript (calculations, tests, etc.).
 *
 * For styling components, always prefer CSS variables via CSS Modules.
 * These constants are secondary — CSS variables are the primary source.
 */

export const colors = {
  // Slate (neutral)
  bgMain: '#f8fafc',
  bgSubtle: '#f1f5f9',
  bgCard: '#ffffff',
  border: '#e2e8f0',
  borderInput: '#cbd5e1',
  textDisabled: '#94a3b8',
  textMuted: '#64748b',
  textOption: '#475569',
  textSecondary: '#334155',
  textUser: '#1e293b',
  textPrimary: '#0f172a',
  bgPanelDark: '#020617',

  // Amber (accent)
  accentSubtle: '#fffbeb',
  accentLight: '#ffeab1',
  accentBorderBadge: '#fde68a',
  accentBorderBtn: '#fcd34d',
  accent: '#ffa705',
  accentLink: '#d97706',
  accentBadgeText: '#b45309',

  // Emerald (success)
  successSubtle: '#ecfdf5',
  successBorder: '#a7f3d0',
  successPulse: '#34d399',
  success: '#10b981',
  successText: '#059669',
  successDark: '#047857',

  // Blue (info / Platina tier)
  infoSubtle: '#eff6ff',
  infoBorder: '#bfdbfe',
  infoText: '#1d4ed8',
  tierPlatinaFrom: '#9ecbff',
  tierPlatinaTo: '#005ecc',
  companyIconBg: '#0075ff',
  betaBg: '#d1e8fa',
  betaText: '#042d78',

  // Warning / Error (technical extension — not in Figma)
  warning: '#f59e0b',
  warningSubtle: '#fffbeb',
  warningBorder: '#fde68a',
  warningText: '#92400e',
  error: '#ef4444',
  errorSubtle: '#fef2f2',
  errorBorder: '#fecaca',
  errorText: '#991b1b',
} as const

export const typography = {
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  size: {
    nano: '0.5rem', // 8px
    tiny: '0.625rem', // 10px
    xs: '0.6875rem', // 11px
    sm: '0.75rem', // 12px
    base: '0.875rem', // 14px
    md: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
} as const

export const radius = {
  sm: '0.25rem', // 4px  — checkbox
  md: '0.5rem', // 8px  — inputs, buttons
  lg: '0.625rem', // 10px — sidebar
  xl: '0.75rem', // 12px — nav links
  '2xl': '1rem', // 16px — cards
  full: '9999px', // pill
} as const

export const shadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  card: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  overlay: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
} as const

export const zIndex = {
  dropdown: 200,
  tooltip: 300,
  modalOverlay: 400,
  modal: 401,
  drawer: 402,
  toast: 500,
} as const
