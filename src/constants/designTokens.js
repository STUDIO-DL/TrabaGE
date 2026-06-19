/** Design tokens — spacing, typography, buttons (mobile-first) */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  headingXl: { size: 32, lineHeight: 1.15, weight: 800 },
  headingL: { size: 28, lineHeight: 1.2, weight: 700 },
  headingM: { size: 24, lineHeight: 1.25, weight: 700 },
  body: { size: 16, lineHeight: 1.5, weight: 400 },
  small: { size: 14, lineHeight: 1.45, weight: 400 },
  caption: { size: 12, lineHeight: 1.4, weight: 400 },
};

export const buttons = {
  primary: { height: 56, radius: 14 },
  secondary: { height: 48, radius: 12 },
};

export const layout = {
  logoMaxHeight: 80,
  onboardingIllustrationMax: 260,
  onboardingIllustrationMin: 220,
  heroImageMaxViewport: 0.35,
  mobileHeights: [667, 736, 812, 844, 896, 932],
};

export const tailwindClasses = {
  btnPrimary:
    'inline-flex h-btn-primary w-full items-center justify-center rounded-btn-primary text-body font-semibold',
  btnSecondary:
    'inline-flex h-btn-secondary w-full items-center justify-center rounded-btn-secondary text-small font-semibold',
  headingXl: 'text-heading-xl font-extrabold tracking-tight',
  headingL: 'text-heading-l font-bold tracking-tight',
  headingM: 'text-heading-m font-bold tracking-tight',
  body: 'text-body',
  small: 'text-small',
  caption: 'text-caption',
};
