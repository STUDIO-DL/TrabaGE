import AppIcon from '../../common/AppIcon';
import { MessageSquare, ICON_SIZES } from '../../../constants/icons';
import Button from '../../ui/Button';
import FollowButton from '../../follow/FollowButton';
import ContentActionMenu from '../../common/ContentActionMenu';
import { REPORT_TARGET_TYPES } from '../../../constants/reportReasons';
import { getShareDescription } from '../../../utils/shareContent';
import {
  profileActionClusterClass,
  profileActionOverflowClass,
  profileActionPrimaryClass,
  profileActionRowClass,
} from './companyProfileStyles';

export default function CompanyProfileActionBar({
  showFollow = false,
  isFollowing = false,
  followLoading = false,
  canFollow = true,
  onToggleFollow,
  shareUrl,
  shareTitle = 'TrabaGE',
  reportTargetId,
  onMessage,
  messageLoading = false,
}) {
  // Public company/org profiles always get ⋯ with Compartir + Reportar.
  // ContentActionMenu resolves a share URL fallback and gates Reportar on targetId.
  const showOverflow = Boolean(shareUrl || reportTargetId);

  return (
    <div className={profileActionRowClass}>
      <div className={profileActionClusterClass}>
        {onMessage ? (
          <Button
            type="button"
            variant="primary"
            onClick={onMessage}
            className={profileActionPrimaryClass}
            loading={messageLoading}
          >
            <AppIcon icon={MessageSquare} size={ICON_SIZES.sm} className="text-current" />
            Mensaje
          </Button>
        ) : null}

        {showFollow ? (
          <FollowButton
            isFollowing={isFollowing}
            loading={followLoading}
            canFollow={canFollow}
            onToggle={onToggleFollow}
            className={profileActionPrimaryClass}
          />
        ) : null}
      </div>

      {showOverflow ? (
        <div className={profileActionOverflowClass}>
          <ContentActionMenu
            shareUrl={shareUrl}
            shareTitle={shareTitle}
            shareText={getShareDescription('company')}
            targetType={REPORT_TARGET_TYPES.PROFILE}
            targetId={reportTargetId}
            variant="button"
          />
        </div>
      ) : null}
    </div>
  );
}
