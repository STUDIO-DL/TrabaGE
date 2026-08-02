/**
 * Candidate profile layout widths — mobile-first.
 * Mobile/tablet keep a single compact column; desktop uses a LinkedIn-style
 * main + secondary rail without stretching endlessly.
 */

/** Body content shell under header / action bar */
export const profileBodyShellClass =
  'mx-auto w-full px-space-base py-space-md sm:py-space-lg lg:max-w-[70rem] lg:px-space-xl xl:max-w-[78rem]';

/** Align header identity block with the body grid on desktop */
export const profileHeaderAlignClass =
  'lg:mx-auto lg:max-w-[70rem] xl:max-w-[78rem]';

/** Action bar inner row — matches body shell width */
export const profileActionBarInnerClass =
  'mx-auto flex w-full max-w-none flex-col gap-space-sm sm:flex-row sm:items-stretch lg:max-w-[70rem] xl:max-w-[78rem]';

/** Desktop: primary column + secondary rail */
export const profileDesktopGridClass =
  'grid gap-space-md lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18.75rem)] lg:items-start lg:gap-space-lg xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-space-xl';

export const profileDesktopMainClass = 'motion-list min-w-0 space-y-space-base';

export const profileDesktopAsideClass =
  'hidden min-w-0 space-y-space-base lg:sticky lg:top-20 lg:block';

/**
 * Shared shell for independent profile sections (Sobre mí, Educación, etc.).
 * Visual only — padding + profile-section-card tokens from index.css.
 */
export const profileSectionCardClass = 'profile-section-card p-space-base sm:p-space-lg';
