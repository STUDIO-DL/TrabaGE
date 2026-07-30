/**
 * Official TrabaGE wordmark.
 * Composition is fixed: "Traba" (app text) + "GE" (brand primary), as one word.
 * Only size may change by context — never colors or letter spacing identity.
 */

const SIZE_CLASS = {
  xs: 'text-caption font-semibold tracking-tight',
  sm: 'text-body-small font-semibold tracking-tight',
  md: 'text-body font-semibold tracking-tight',
  lg: 'text-title font-bold tracking-tight',
  xl: 'text-heading-m font-bold tracking-tight',
  /** Auth / splash hero */
  hero: 'text-[1.75rem] font-bold leading-none tracking-tight sm:text-[1.875rem]',
};

/** Plain-text brand name for titles, share strings, metadata (not visual). */
export const TRABAGE_BRAND_NAME = 'TrabaGE';

/**
 * @param {object} props
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|'hero'} [props.size]
 * @param {string} [props.className]
 * @param {keyof JSX.IntrinsicElements} [props.as]
 */
export default function TrabaGEWordmark({
  size = 'md',
  className = '',
  as: Component = 'span',
  ...props
}) {
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.md;

  return (
    <Component
      className={['inline-flex items-baseline whitespace-nowrap', sizeClass, className]
        .filter(Boolean)
        .join(' ')}
      aria-label={TRABAGE_BRAND_NAME}
      {...props}
    >
      <span className="text-app-text">Traba</span>
      <span className="text-primary-600 dark:text-primary-400">GE</span>
    </Component>
  );
}
