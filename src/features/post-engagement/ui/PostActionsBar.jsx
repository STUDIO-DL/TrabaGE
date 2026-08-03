import { useEffect, useRef, useState } from 'react';
import AppIcon from '../../../components/common/AppIcon';
import {
  Heart,
  MessageSquare,
  Repeat2,
  Share2,
  Bookmark,
  BookmarkCheck,
  ICON_SIZES,
} from '../../../constants/icons';
import { formatEngagementCount } from './formatEngagementCount';

const BTN =
  'inline-flex min-h-touch flex-1 items-center justify-center gap-1.5 rounded-radius-sm px-space-xs py-space-sm text-caption font-medium text-app-muted transition-colors duration-fast hover:bg-app-surface hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';

function ActionButton({ icon: Icon, label, count, active, activeClass, onClick, ariaPressed }) {
  const countLabel = formatEngagementCount(count);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${BTN} ${active ? activeClass : ''}`}
      aria-label={label}
      aria-pressed={ariaPressed}
    >
      <AppIcon
        icon={Icon}
        size={ICON_SIZES.md}
        className={active ? activeClass : 'text-app-subtle'}
      />
      {countLabel ? <span>{countLabel}</span> : null}
    </button>
  );
}

/** Instagram-style filled heart with a short scale pop on like. */
function LikeButton({ liked, count, onClick }) {
  const [popping, setPopping] = useState(false);
  const prevLikedRef = useRef(liked);
  const countLabel = formatEngagementCount(count);

  useEffect(() => {
    const wasLiked = prevLikedRef.current;
    prevLikedRef.current = liked;
    if (!liked || wasLiked) return undefined;

    setPopping(true);
    const timer = window.setTimeout(() => setPopping(false), 220);
    return () => window.clearTimeout(timer);
  }, [liked]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${BTN} ${liked ? 'text-error-600' : ''}`}
      aria-label="Me gusta"
      aria-pressed={Boolean(liked)}
    >
      <AppIcon
        icon={Heart}
        size={ICON_SIZES.md}
        fill={liked ? 'currentColor' : 'none'}
        strokeWidth={liked ? 1.75 : 2}
        className={[
          liked ? 'text-error-600' : 'text-app-subtle',
          popping ? 'animate-heart-like' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {countLabel ? <span>{countLabel}</span> : null}
    </button>
  );
}

export default function PostActionsBar({
  engagement,
  onLike,
  onComment,
  onRepost,
  onShare,
  onSave,
}) {
  return (
    <div className="mt-space-md border-t border-app-divider pt-space-xs">
      <div className="flex items-stretch gap-0.5">
        <LikeButton
          liked={Boolean(engagement?.liked_by_me)}
          count={engagement?.likes_count}
          onClick={onLike}
        />
        <ActionButton
          icon={MessageSquare}
          label="Comentar"
          count={engagement?.comments_count}
          onClick={onComment}
        />
        <ActionButton
          icon={Repeat2}
          label="Repost"
          count={engagement?.reposts_count}
          active={engagement?.reposted_by_me}
          activeClass="text-primary-600"
          ariaPressed={Boolean(engagement?.reposted_by_me)}
          onClick={onRepost}
        />
        <button type="button" onClick={onShare} className={BTN} aria-label="Compartir fuera de TrabaGE">
          <AppIcon icon={Share2} size={ICON_SIZES.md} className="text-app-subtle" />
        </button>
        <button
          type="button"
          onClick={onSave}
          className={`${BTN} ${engagement?.saved_by_me ? 'text-primary-600' : ''}`}
          aria-label={engagement?.saved_by_me ? 'Quitar de guardados' : 'Guardar publicación'}
          aria-pressed={Boolean(engagement?.saved_by_me)}
        >
          <AppIcon
            icon={engagement?.saved_by_me ? BookmarkCheck : Bookmark}
            size={ICON_SIZES.md}
            className={engagement?.saved_by_me ? 'text-primary-600' : 'text-app-subtle'}
          />
        </button>
      </div>
    </div>
  );
}
