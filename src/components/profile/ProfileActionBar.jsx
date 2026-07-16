import AppIcon from '../common/AppIcon';
import { Phone, Share2, ICON_SIZES } from '../../constants/icons';
import Button from '../ui/Button';
import FollowButton from '../follow/FollowButton';

export default function ProfileActionBar({
  isOwn = false,
  onContact,
  contactDisabled,
  contactLabel = 'Contactar',
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
        {onContact && (
          <Button
            type="button"
            onClick={onContact}
            disabled={contactDisabled}
            variant={showFollow ? 'secondary' : 'primary'}
            className="sm:flex-1"
            fullWidth
          >
            <AppIcon icon={Phone} size={ICON_SIZES.md} className="text-current" />
            {contactLabel}
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
      {contactDisabled && onContact && (
        <p className="mx-auto mt-space-sm max-w-5xl text-center text-caption text-app-muted sm:text-left">
          Esta empresa aún no ha configurado un medio de contacto.
        </p>
      )}
    </div>
  );
}
