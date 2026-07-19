export const premiumCardClass =
  'overflow-hidden rounded-radius-lg border border-app-border bg-app-card shadow-elevation-1';

export const sectionTitleClass =
  'text-subtitle font-semibold text-app-text';

export const profileContentShellClass = 'w-full';

export const profileInicioGridClass = 'grid gap-space-base';

export const sectionCardClass =
  'overflow-hidden rounded-radius-lg border border-app-border bg-app-card p-space-base shadow-elevation-1';

export const sectionHeaderClass =
  'mb-space-sm flex items-center justify-between gap-space-sm';

export const sectionLinkClass =
  'shrink-0 text-caption font-medium text-primary-600 transition-colors duration-fast hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2';

export const profileMetaItemClass =
  'inline-flex items-center gap-space-xs text-caption text-app-muted';

export const profileBannerMetaItemClass =
  'inline-flex items-center gap-space-xs text-caption text-white/90';

export const profileCoverOverlayClass =
  'absolute inset-0 bg-gradient-to-b from-black/15 via-black/30 to-black/60';

export const profileBannerGradientClass =
  'absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500';

/** Shared cover height across personal, business, and organization profiles */
export const profileCoverHeightClass = 'h-[7.5rem] sm:h-[8.5rem]';

/** Padding for the info block below the cover */
export const profileHeaderContentClass = 'px-space-base pb-space-md sm:px-space-lg';

/** Avatar/logo + info row — stacks on mobile, side-by-side from sm */
export const profileHeaderBodyClass =
  'flex flex-col gap-space-md sm:flex-row sm:items-start sm:gap-space-lg md:gap-space-xl';

/** Company header — stacks on mobile, logo + name side-by-side from sm (LinkedIn-style) */
export const profileCompanyHeaderBodyClass =
  'flex flex-col gap-space-md sm:flex-row sm:items-start sm:gap-space-lg';

/** Pull personal avatar up ~50% into the cover (4.5rem mobile / 7rem sm+) */
export const profilePersonalAvatarOverlapClass = '-mt-[2.25rem] sm:-mt-[3.5rem]';

/** Pull company logo up ~50% into the cover (7rem avatar + frame) */
export const profileCompanyLogoOverlapClass = '-mt-[2.25rem] sm:-mt-[3.5rem]';

/** Reserve space beside the logo on sm+ so the company name clears the avatar block */
export const profileCompanyHeaderInfoClass =
  'min-w-0 flex-1 pt-space-xs sm:pt-[3.75rem]';

export const profilePersonalAvatarFrameClass =
  'rounded-radius-circular bg-app-card p-0.5 ring-4 ring-app-card shadow-elevation-2';

export const profileCompanyLogoFrameClass =
  'rounded-radius-md bg-app-card p-1 ring-4 ring-app-card shadow-elevation-2';

export const profileNameHeadingClass =
  'break-words text-title font-bold leading-snug text-app-text sm:text-heading-m';

export const profileCompanyNameHeadingClass =
  'break-words text-title font-bold leading-snug text-app-text sm:text-heading-m';

export const profileHeadlineClass =
  'mt-space-xs break-words text-body-small text-app-muted sm:text-body';

export const profileHeaderInfoClass = 'min-w-0 flex-1 pt-space-xs sm:pt-space-md';

/** Tiny spacing token alias used for company name row alignment */
export const profileCompanyNameRowClass =
  'flex min-w-0 items-start gap-space-xs sm:items-center sm:gap-space-sm';

export const profileActionButtonClass =
  'h-10 min-h-0 shrink-0 px-space-md text-body-small font-medium';

export const profileBannerGhostButtonClass =
  'inline-flex h-10 min-h-0 shrink-0 items-center justify-center gap-space-xs rounded-radius-md bg-transparent px-space-md text-body-small font-medium text-white ring-1 ring-inset ring-white/90 transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-700 disabled:cursor-not-allowed disabled:opacity-50';

export const profileBannerMenuButtonClass =
  'inline-flex h-10 min-h-0 min-w-10 shrink-0 items-center justify-center rounded-radius-md bg-transparent text-white ring-1 ring-inset ring-white/90 transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-700';

export const profileBannerFollowButtonClass =
  'h-10 min-h-0 shrink-0 px-space-md text-body-small font-medium';

export const profileBannerFollowFollowingClass =
  'inline-flex h-10 min-h-0 shrink-0 items-center justify-center gap-space-xs rounded-radius-md bg-white/15 px-space-md text-body-small font-medium text-white ring-1 ring-inset ring-white/70 transition-colors duration-200 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-700 disabled:cursor-not-allowed disabled:opacity-50';

export const profileTabButtonClass =
  'relative flex h-12 shrink-0 items-center px-space-md text-body-small font-medium transition-colors duration-200';
