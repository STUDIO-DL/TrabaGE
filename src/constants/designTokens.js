/**
 * TrabaGE Design System tokens
 * Brand preserved: Primary #2563EB · Font Inter · existing app semantic surfaces.
 * Prefer Tailwind classes wired from these tokens (e.g. bg-primary-600, text-heading-m, p-space-lg, shadow-elevation-2).
 */

/** Brand anchor — do not change without an intentional rebrand */
export const BRAND = {
  primary: '#2563EB',
  primaryRgb: '37 99 235',
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
};

/**
 * Color scales derived from existing TrabaGE primary (#2563EB = blue-600)
 * and semantic greens/ambers/reds already used in the app.
 */
export const colors = {
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB', // brand DEFAULT
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A', // existing --color-success
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626', // existing --color-danger
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
  /** Semantic surfaces — CSS vars supply light/dark values */
  surface: {
    bg: 'rgb(var(--app-bg) / <alpha-value>)',
    surface: 'rgb(var(--app-surface) / <alpha-value>)',
    card: 'rgb(var(--app-card) / <alpha-value>)',
    elevated: 'rgb(var(--app-elevated) / <alpha-value>)',
    border: 'rgb(var(--app-border) / <alpha-value>)',
    divider: 'rgb(var(--app-divider) / <alpha-value>)',
    overlay: 'rgb(var(--app-overlay) / <alpha-value>)',
    disabled: 'rgb(var(--app-disabled) / <alpha-value>)',
    primarySoft: 'rgb(var(--app-primary-soft) / <alpha-value>)',
  },
  text: {
    primary: 'rgb(var(--app-text) / <alpha-value>)',
    secondary: 'rgb(var(--app-muted) / <alpha-value>)',
    subtle: 'rgb(var(--app-subtle) / <alpha-value>)',
    disabled: 'rgb(var(--app-text-disabled) / <alpha-value>)',
    inverse: 'rgb(var(--app-text-inverse) / <alpha-value>)',
  },
};

/**
 * Spacing scale (px): 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
 * Use `space-*` classes (e.g. p-space-lg). Legacy xs/sm/md/lg/xl kept for existing screens.
 */
export const spacing = {
  xs: 4, // 4
  sm: 8, // 8
  md: 12, // 12 — new canonical; legacy `md` in Tailwind stays 16 via alias
  base: 16, // 16
  lg: 20, // 20
  xl: 24, // 24
  '2xl': 32, // 32
  '3xl': 40, // 40
  '4xl': 48, // 48
  '5xl': 64, // 64
};

/** Legacy spacing aliases used by auth/onboarding screens (do not remap casually) */
export const spacingLegacy = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  circular: 9999,
  /** Component-specific (existing brand feel) */
  btnPrimary: 14,
  btnSecondary: 12,
};

/** Exactly 4 elevation levels */
export const elevation = {
  1: '0 1px 2px rgb(var(--app-shadow) / 0.06), 0 1px 3px rgb(var(--app-shadow) / 0.04)',
  2: '0 4px 8px rgb(var(--app-shadow) / 0.08), 0 2px 4px rgb(var(--app-shadow) / 0.04)',
  3: '0 10px 24px rgb(var(--app-shadow) / 0.10), 0 4px 8px rgb(var(--app-shadow) / 0.05)',
  4: '0 20px 40px rgb(var(--app-shadow) / 0.14), 0 8px 16px rgb(var(--app-shadow) / 0.06)',
};

export const motion = {
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
  },
  easing: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export const borderWidth = {
  none: 0,
  thin: 1,
  medium: 2,
  thick: 3,
};

/** Icon size tokens (px) — Lucide, stroke 2 by default */
export const iconSize = {
  sm: 16,
  md: 18,
  lg: 22,
  xl: 28,
};

export const iconStroke = {
  default: 2,
  thin: 1.5,
  bold: 2.25,
};

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
};

export const componentSize = {
  button: {
    sm: { height: 36, px: 12, font: 'small' },
    md: { height: 44, px: 16, font: 'button' },
    lg: { height: 52, px: 24, font: 'button' },
    primaryMobile: { height: 56, radius: 14 },
    secondaryMobile: { height: 48, radius: 12 },
  },
  input: {
    height: 44,
    radius: 12,
  },
  avatar: {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
  },
  touch: 44,
};

export const typography = {
  display: { size: 40, lineHeight: 1.1, weight: 800, letterSpacing: '-0.02em' },
  headingXl: { size: 32, lineHeight: 1.15, weight: 800, letterSpacing: '-0.02em' },
  headingL: { size: 28, lineHeight: 1.2, weight: 700, letterSpacing: '-0.015em' },
  headingM: { size: 24, lineHeight: 1.25, weight: 700, letterSpacing: '-0.01em' },
  title: { size: 20, lineHeight: 1.3, weight: 600, letterSpacing: '-0.01em' },
  subtitle: { size: 18, lineHeight: 1.4, weight: 500 },
  body: { size: 16, lineHeight: 1.5, weight: 400 },
  bodySmall: { size: 14, lineHeight: 1.45, weight: 400 },
  caption: { size: 12, lineHeight: 1.4, weight: 400 },
  button: { size: 15, lineHeight: 1.2, weight: 600 },
  label: { size: 13, lineHeight: 1.3, weight: 500 },
};

export const layout = {
  maxWidth: {
    screen: '32rem', // max-w-lg — mobile app shell
    content: '42rem',
    wide: '64rem',
  },
  pagePaddingX: 16,
  pagePaddingY: 16,
  sectionGap: 24,
  logoMaxHeight: 80,
  onboardingIllustrationMax: 260,
  onboardingIllustrationMin: 220,
  heroImageMaxViewport: 0.35,
  safeArea: {
    top: 'env(safe-area-inset-top, 0px)',
    bottom: 'env(safe-area-inset-bottom, 0px)',
    left: 'env(safe-area-inset-left, 0px)',
    right: 'env(safe-area-inset-right, 0px)',
  },
};

/** Ready-to-use Tailwind class strings for typography / buttons */
export const tailwindClasses = {
  display: 'text-display font-extrabold tracking-tight',
  headingXl: 'text-heading-xl font-extrabold tracking-tight',
  headingL: 'text-heading-l font-bold tracking-tight',
  headingM: 'text-heading-m font-bold tracking-tight',
  title: 'text-title font-semibold tracking-tight',
  subtitle: 'text-subtitle font-medium',
  body: 'text-body',
  bodySmall: 'text-body-small',
  /** @deprecated use bodySmall */
  small: 'text-body-small',
  caption: 'text-caption',
  button: 'text-button font-semibold',
  label: 'text-label font-medium',
  btnPrimary:
    'inline-flex h-btn-primary w-full items-center justify-center rounded-btn-primary text-body font-semibold',
  btnSecondary:
    'inline-flex h-btn-secondary w-full items-center justify-center rounded-btn-secondary text-body-small font-semibold',
};

/** Alias for older typography shape */
export const buttons = {
  primary: { height: 56, radius: 14 },
  secondary: { height: 48, radius: 12 },
};
