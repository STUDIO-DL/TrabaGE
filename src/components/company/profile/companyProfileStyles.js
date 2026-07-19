/** Shared layout tokens for company / organization profiles (mobile-first). */

export const profileContentShellClass = 'mx-auto w-full max-w-lg';

export const profileSectionStackClass = 'space-y-space-base px-space-base py-space-base';

export const profileInicioGridClass = 'space-y-space-base';

export const sectionTitleClass = 'text-subtitle font-semibold text-app-text';

export const sectionLinkClass =
  'shrink-0 text-caption font-medium text-primary-600 transition-colors duration-fast hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2';

export const profileMetaLineClass =
  'flex items-start gap-space-sm break-words text-caption text-app-muted';

export const profileMetaIconClass = 'mt-0.5 shrink-0 text-app-text';

export const profileCoverOverlayClass =
  'absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/55';

export const profileBannerGradientClass =
  'absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500';

/** Cover height — consistent across profile types */
export const profileCoverHeightClass = 'h-[8rem] sm:h-[9rem]';

/** Content below cover */
export const profileHeaderContentClass = 'px-space-base pb-space-lg pt-0';

/** Logo overlaps cover (~50%); identity block is a separate sibling below */
export const profileCompanyLogoOverlapClass = '-mt-[3.25rem] sm:-mt-[3.75rem]';

export const profileCompanyLogoFrameClass =
  'rounded-radius-md bg-app-card p-1 ring-4 ring-app-card shadow-elevation-2';

export const profileCompanyNameHeadingClass =
  'break-words text-title font-bold leading-snug text-app-text sm:text-heading-m';

export const profileCompanyNameRowClass =
  'flex min-w-0 flex-wrap items-center gap-x-space-sm gap-y-space-xs';

export const profileHeadlineClass =
  'break-words text-body-small leading-relaxed text-app-muted sm:text-body';

/** Compact profile action buttons — inline row, not full-width stack */
export const profileActionButtonClass = 'h-btn-md min-h-touch shrink-0 px-space-md';

export const profileBannerGhostButtonClass =
  'inline-flex h-btn-md min-h-touch shrink-0 items-center justify-center gap-space-xs rounded-radius-md bg-transparent px-space-md text-body-small font-semibold text-white ring-1 ring-inset ring-white/90 transition-colors duration-fast hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-700 disabled:cursor-not-allowed disabled:opacity-50';

export const profileBannerMenuButtonClass =
  'inline-flex h-btn-md min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-md bg-transparent text-white ring-1 ring-inset ring-white/90 transition-colors duration-fast hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-700';

export const profileBannerFollowButtonClass =
  'h-btn-md min-h-touch shrink-0 px-space-md text-body-small font-semibold';

export const profileBannerFollowFollowingClass =
  'inline-flex h-btn-md min-h-touch shrink-0 items-center justify-center gap-space-xs rounded-radius-md bg-white/15 px-space-md text-body-small font-semibold text-white ring-1 ring-inset ring-white/70 transition-colors duration-fast hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-700 disabled:cursor-not-allowed disabled:opacity-50';

export const profileTabButtonClass =
  'relative flex h-12 shrink-0 items-center px-space-md text-body-small font-medium transition-colors duration-fast';

export const JOB_STATUS_LABELS = {
  draft: 'Borrador',
  active: 'Publicada',
  paused: 'Pausada',
  closed: 'Cerrada',
};

/** @deprecated use surface-card via CompanyProfileSectionCard */
export const sectionCardClass =
  'overflow-hidden rounded-radius-lg border border-app-border bg-app-card p-space-base shadow-elevation-1';

export const sectionHeaderClass =
  'mb-space-md flex items-center justify-between gap-space-sm';

/** Legacy exports used by candidate profile header */
export const profileHeaderBodyClass =
  'flex flex-col gap-space-md sm:flex-row sm:items-start sm:gap-space-lg md:gap-space-xl';

export const profileCompanyHeaderBodyClass = 'flex flex-col items-stretch gap-0';

export const profilePersonalAvatarOverlapClass = '-mt-[2.25rem] sm:-mt-[3.5rem]';

export const profilePersonalAvatarFrameClass =
  'rounded-radius-circular bg-app-card p-0.5 ring-4 ring-app-card shadow-elevation-2';

export const profileNameHeadingClass =
  'break-words text-title font-bold leading-snug text-app-text sm:text-heading-m';

export const profileHeaderInfoClass = 'min-w-0 flex-1 pt-space-xs sm:pt-space-md';

export const profileCompanyHeaderInfoClass = 'min-w-0 w-full space-y-space-sm';

export const profileMetaItemClass =
  'inline-flex items-center gap-space-xs text-caption text-app-muted';

export const profileBannerMetaItemClass =
  'inline-flex items-center gap-space-xs text-caption text-white/90';

export const premiumCardClass =
  'overflow-hidden rounded-radius-lg border border-app-border bg-app-card shadow-elevation-1';
