import { useDocumentPullToRefresh } from '../../hooks/useDocumentPullToRefresh';

/**
 * Subtle top indicator for installed-PWA pull-to-refresh.
 * No-op in browser tabs (native overscroll / PTR handles those).
 */
export default function DocumentPullToRefresh() {
  const { active, pullPx, refreshing, progress, armed } = useDocumentPullToRefresh();

  if (!active || (pullPx <= 0 && !refreshing)) return null;

  const visiblePx = refreshing ? 36 : Math.max(0, pullPx);
  const opacity = refreshing ? 1 : Math.min(1, 0.25 + progress * 0.75);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)',
        height: visiblePx + 12,
        opacity,
      }}
      aria-hidden
    >
      <div
        className={[
          'mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-app-card shadow-sm',
          refreshing || armed ? 'text-primary-600' : 'text-app-muted',
        ].join(' ')}
        style={{
          transform: refreshing ? 'none' : `translateY(${Math.max(0, pullPx - 28)}px) rotate(${progress * 180}deg)`,
          transition: refreshing ? 'transform 160ms ease-out' : 'none',
        }}
      >
        <span
          className={[
            'inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent',
            refreshing ? 'animate-spin' : '',
          ].join(' ')}
        />
      </div>
    </div>
  );
}
