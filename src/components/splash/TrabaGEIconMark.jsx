/**
 * Minimal TrabaGE mark — the app “T” icon for quick startup transitions
 * (white-screen splash after the first full branded visit).
 */
export default function TrabaGEIconMark({ className = '', ...props }) {
  return (
    <img
      src="/icons/trabage-icon-192.png"
      alt=""
      width={96}
      height={96}
      decoding="async"
      draggable={false}
      className={['pointer-events-none select-none', className].filter(Boolean).join(' ')}
      aria-hidden="true"
      {...props}
    />
  );
}
