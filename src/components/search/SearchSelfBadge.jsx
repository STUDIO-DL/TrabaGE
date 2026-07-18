/** Badge shown when a search hit is the signed-in user's own profile. */
export default function SearchSelfBadge({ className = '' }) {
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center rounded-full bg-primary-100 px-space-sm py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-700',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Eres tú"
    >
      Tú
    </span>
  );
}
