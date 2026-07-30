import AppIcon from '../common/AppIcon';
import { Share2, ICON_SIZES } from '../../constants/icons';
import MessagesChatIcon from '../messages/MessagesChatIcon';
import Button from '../ui/Button';
import FollowButton from '../follow/FollowButton';
import { profileActionBarInnerClass } from './profileLayoutClasses';

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
    <div className="border-b border-app-border bg-app-card px-space-base py-space-base lg:px-space-xl">
      <div className={profileActionBarInnerClass}>
        {showFollow && (
          <FollowButton
            isFollowing={isFollowing}
            loading={followLoading}
            canFollow={canFollow}
            onToggle={onToggleFollow}
            className="sm:flex-1 lg:flex-none lg:min-w-[9rem]"
          />
        )}
        {onMessage && (
          <Button
            type="button"
            onClick={onMessage}
            variant="primary"
            className="sm:flex-1 lg:flex-none lg:min-w-[9rem]"
            fullWidth
            loading={messageLoading}
          >
            <AppIcon icon={MessagesChatIcon} size={ICON_SIZES.md} className="text-current" />
            {messageLabel}
          </Button>
        )}
        {onShare && (
          <Button
            type="button"
            onClick={onShare}
            variant="secondary"
            className="sm:flex-1 lg:flex-none lg:min-w-[9rem]"
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
