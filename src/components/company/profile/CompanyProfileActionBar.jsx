import { useState, useEffect, useRef } from 'react';
import AppIcon from '../../common/AppIcon';
import {
  AlertTriangle,
  Briefcase,
  Copy,
  MoreVertical,
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

function ProfileMenu({
  onShare,
  onCopy,
  onContact,
  contactDisabled,
  onReport,
}) {
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

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-md ring-1 ring-inset ring-app-border bg-app-card text-app-muted transition-colors duration-fast hover:bg-app-surface"
        aria-label="Más opciones"
        aria-expanded={open}
      >
        <AppIcon icon={MoreVertical} size={ICON_SIZES.md} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-space-xs min-w-[200px] overflow-hidden rounded-radius-md border border-app-border bg-app-card py-space-xs shadow-elevation-3">
          {onShare && (
            <button
              type="button"
              onClick={() => run(onShare)}
              className="flex w-full min-h-touch items-center gap-space-sm px-space-base py-space-sm text-left text-body-small text-app-text transition-colors duration-fast hover:bg-app-surface"
            >
              <AppIcon icon={Share2} size={ICON_SIZES.sm} className="text-app-subtle" />
              Compartir
            </button>
          )}
          {onCopy && (
            <button
              type="button"
              onClick={() => run(onCopy)}
              className="flex w-full min-h-touch items-center gap-space-sm px-space-base py-space-sm text-left text-body-small text-app-text transition-colors duration-fast hover:bg-app-surface"
            >
              <AppIcon icon={Copy} size={ICON_SIZES.sm} className="text-app-subtle" />
              Copiar enlace
            </button>
          )}
          {onContact && (
            <button
              type="button"
              onClick={() => run(onContact)}
              disabled={contactDisabled}
              className="flex w-full min-h-touch items-center gap-space-sm px-space-base py-space-sm text-left text-body-small text-app-text transition-colors duration-fast hover:bg-app-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              <AppIcon icon={Phone} size={ICON_SIZES.sm} className="text-app-subtle" />
              Contactar
            </button>
          )}
          {onReport && (
            <button
              type="button"
              onClick={() => run(onReport)}
              className="flex w-full min-h-touch items-center gap-space-sm px-space-base py-space-sm text-left text-body-small text-app-text transition-colors duration-fast hover:bg-app-surface"
            >
              <AppIcon icon={AlertTriangle} size={ICON_SIZES.sm} className="text-amber-600" />
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
      <div className="flex items-center gap-space-sm">
        {showFollow && (
          <FollowButton
            isFollowing={isFollowing}
            loading={followLoading}
            canFollow={canFollow}
            onToggle={onToggleFollow}
            className="min-h-touch flex-1"
          />
        )}
        {hasJobs && (
          <Button
            type="button"
            variant="secondary"
            onClick={onViewJobs}
            className="min-h-touch flex-1 gap-space-xs"
          >
            <AppIcon icon={Briefcase} size={ICON_SIZES.sm} className="text-current" />
            Ver empleos
          </Button>
        )}
        <ProfileMenu
          onShare={shareUrl ? handleShare : undefined}
          onCopy={shareUrl ? handleCopy : undefined}
          onContact={onContact}
          contactDisabled={contactDisabled}
          onReport={reportTargetId ? handleReport : undefined}
        />
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
