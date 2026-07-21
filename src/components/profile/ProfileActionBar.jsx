import AppIcon from '../common/AppIcon';
import { MessageSquare, Share2, ICON_SIZES } from '../../constants/icons';
import Button from '../ui/Button';
import FollowButton from '../follow/FollowButton';

export default function ProfileActionBar({
  isOwn = false,
  onMessage,
  messageLabel = 'Mensaje',
  messageLoading = false,
  showFollow = false,
  isFollowing = false,
  followLoading = false,
  canFollow = true,
  onToggleFollow,
  onShare,
}) {
  if (isOwn) return null;

  return (
    <div className="border-b border-app-border bg-app-card px-space-base py-space-base">
      <div className="mx-auto flex max-w-5xl flex-col gap-space-sm sm:flex-row sm:items-stretch">
        {showFollow && (
          <FollowButton
            isFollowing={isFollowing}
            loading={followLoading}
            canFollow={canFollow}
            onToggle={onToggleFollow}
            className="sm:flex-1"
          />
        )}
        {onMessage && (
          <Button
            type="button"
            onClick={onMessage}
            variant="primary"
            className="sm:flex-1"
            fullWidth
            loading={messageLoading}
          >
            <AppIcon icon={MessageSquare} size={ICON_SIZES.md} className="text-current" />
            {messageLabel}
          </Button>
        )}
        {onShare && (
          <Button
            type="button"
            onClick={onShare}
            variant="secondary"
            className="sm:flex-1"
            fullWidth
          >
            <AppIcon icon={Share2} size={ICON_SIZES.md} className="text-current" />
            Compartir
          </Button>
        )}
      </div>
    </div>
  );
}
