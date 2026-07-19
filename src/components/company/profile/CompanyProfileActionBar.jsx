import { useState, useEffect, useRef } from 'react';
import AppIcon from '../../common/AppIcon';
import {
  AlertTriangle,
  Copy,
  MoreHorizontal,
  Phone,
  Share2,
  ICON_SIZES,
} from '../../../constants/icons';
import Button from '../../ui/Button';
import FollowButton from '../../follow/FollowButton';
import ReportModal from '../../common/ReportModal';
import { useAuth } from '../../../hooks/useAuth';
import { useNotificationContext } from '../../../context/NotificationContext';
import { notifyGuestBlocked } from '../../../utils/guestMode';
import { shareContent, copyLink, getShareDescription } from '../../../utils/shareContent';
import { REPORT_TARGET_TYPES } from '../../../constants/reportReasons';
import {
  profileActionButtonClass,
  profileActionStripClass,
  profileActionStripInnerClass,
} from './companyProfileStyles';

function ProfileOverflowMenu({ onShare, onCopy, onReport }) {
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const run = (fn) => {
    setOpen(false);
    fn?.();
  };

  if (!onShare && !onCopy && !onReport) return null;

  return (
    <div className="relative shrink-0 sm:w-auto" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-btn-md min-h-touch min-w-touch w-full items-center justify-center rounded-radius-md bg-app-card text-app-text ring-1 ring-inset ring-app-border transition-colors duration-fast hover:bg-app-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 sm:w-auto"
        aria-label="Más opciones"
        aria-expanded={open}
      >
        <AppIcon icon={MoreHorizontal} size={ICON_SIZES.md} className="text-app-text" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-space-xs min-w-[200px] overflow-hidden rounded-radius-md border border-app-border bg-app-card py-space-xs shadow-elevation-3">
          {onShare && (
            <button
              type="button"
              onClick={() => run(onShare)}
              className="flex w-full min-h-touch items-center gap-space-sm px-space-base py-space-sm text-left text-body-small text-app-text transition-colors duration-fast hover:bg-app-surface"
            >
              <AppIcon icon={Share2} size={ICON_SIZES.sm} className="text-app-text" />
              Compartir
            </button>
          )}
          {onCopy && (
            <button
              type="button"
              onClick={() => run(onCopy)}
              className="flex w-full min-h-touch items-center gap-space-sm px-space-base py-space-sm text-left text-body-small text-app-text transition-colors duration-fast hover:bg-app-surface"
            >
              <AppIcon icon={Copy} size={ICON_SIZES.sm} className="text-app-text" />
              Copiar enlace
            </button>
          )}
          {onReport && (
            <button
              type="button"
              onClick={() => run(onReport)}
              className="flex w-full min-h-touch items-center gap-space-sm px-space-base py-space-sm text-left text-body-small text-app-text transition-colors duration-fast hover:bg-app-surface"
            >
              <AppIcon icon={AlertTriangle} size={ICON_SIZES.sm} className="text-app-text" />
              Reportar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CompanyProfileActionBar({
  showFollow = false,
  isFollowing = false,
  followLoading = false,
  canFollow = true,
  onToggleFollow,
  onViewJobs,
  hasJobs = false,
  shareUrl,
  shareTitle = 'TrabaGE',
  reportTargetId,
  onContact,
  contactDisabled = false,
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const { isPreviewMode, user } = useAuth();
  const { showToast } = useNotificationContext();

  const handleShare = () => {
    shareContent({
      title: shareTitle,
      text: getShareDescription('company'),
      url: shareUrl,
      showToast,
    });
  };

  const handleCopy = () => {
    copyLink(shareUrl, showToast);
  };

  const handleReport = () => {
    if (isPreviewMode || !user) {
      notifyGuestBlocked(showToast);
      return;
    }
    setReportOpen(true);
  };

  return (
    <>
      <div className={profileActionStripClass}>
        <div className={profileActionStripInnerClass}>
          {showFollow && (
            <FollowButton
              isFollowing={isFollowing}
              loading={followLoading}
              canFollow={canFollow}
              onToggle={onToggleFollow}
              className={profileActionButtonClass}
            />
          )}

          {onContact && (
            <Button
              type="button"
              onClick={onContact}
              disabled={contactDisabled}
              variant={showFollow ? 'secondary' : 'primary'}
              className={profileActionButtonClass}
              fullWidth
            >
              <AppIcon icon={Phone} size={ICON_SIZES.md} className="text-current" />
              Contactar
            </Button>
          )}

          {hasJobs && onViewJobs && (
            <Button
              type="button"
              variant="secondary"
              onClick={onViewJobs}
              className={profileActionButtonClass}
              fullWidth
            >
              Ver empleos
            </Button>
          )}

          {shareUrl && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleShare}
              className={profileActionButtonClass}
              fullWidth
            >
              <AppIcon icon={Share2} size={ICON_SIZES.md} className="text-current" />
              Compartir
            </Button>
          )}

          <ProfileOverflowMenu
            onCopy={shareUrl ? handleCopy : undefined}
            onReport={reportTargetId ? handleReport : undefined}
          />
        </div>
      </div>

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType={REPORT_TARGET_TYPES.PROFILE}
        targetId={reportTargetId}
      />
    </>
  );
}
