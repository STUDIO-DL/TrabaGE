import AppIcon from '../common/AppIcon';
import { Clock, ICON_SIZES } from '../../constants/icons';
import { MESSAGE_EPHEMERAL_BANNER } from '../../constants/messageTtl';

/**
 * Compact, non-blocking notice that all chat messages auto-expire after 14 days.
 */
export default function EphemeralMessagesBanner() {
  return (
    <div
      role="status"
      className="mx-space-base mt-space-sm flex items-start gap-space-sm rounded-radius-lg border border-app-border/80 bg-app-card/90 px-space-md py-space-sm shadow-elevation-1 backdrop-blur-sm"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-radius-md bg-primary-50 text-primary-600 dark:bg-primary-50/15">
        <AppIcon icon={Clock} size={ICON_SIZES.sm} strokeWidth={1.9} aria-hidden />
      </span>
      <p className="min-w-0 flex-1 pt-0.5 text-caption leading-snug text-app-muted">
        {MESSAGE_EPHEMERAL_BANNER}
      </p>
    </div>
  );
}
