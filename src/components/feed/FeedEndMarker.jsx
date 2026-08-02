import AppIcon from '../common/AppIcon';
import { Newspaper, ICON_SIZES } from '../../constants/icons';

/**
 * Compact end-of-feed marker (LinkedIn-style). No large bottom margins —
 * .page-shell already clears the fixed BottomNav.
 */
export default function FeedEndMarker({
  message = 'No hay más publicaciones por ahora.',
}) {
  return (
    <div
      className="flex flex-col items-center gap-space-sm px-space-base pb-space-sm pt-space-md text-center"
      role="status"
      aria-live="polite"
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-radius-circular bg-app-surface text-app-subtle ring-1 ring-app-border"
        aria-hidden
      >
        <AppIcon icon={Newspaper} size={ICON_SIZES.sm} className="text-app-subtle" />
      </span>
      <p className="text-caption text-app-subtle">{message}</p>
    </div>
  );
}
