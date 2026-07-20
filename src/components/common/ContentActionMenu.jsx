import { useState } from 'react';
import ActionMenu from './ActionMenu';
import ReportModal from './ReportModal';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { notifyGuestBlocked } from '../../utils/guestMode';
import { generateShareUrl } from '../../utils/generateShareUrl';
import { shareContent, copyLink, getShareDescription } from '../../utils/shareContent';

function resolveShareUrl(shareUrl) {
  if (typeof shareUrl === 'string' && shareUrl.trim().length > 0) {
    return shareUrl.startsWith('http') ? shareUrl : generateShareUrl(shareUrl);
  }
  if (typeof window !== 'undefined' && window.location?.href) {
    return window.location.href;
  }
  return '';
}

export default function ContentActionMenu({
  shareUrl,
  shareTitle = 'TrabaGE',
  shareText,
  targetType,
  targetId,
  align = 'right',
  variant = 'icon',
  className = '',
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const { isPreviewMode, user } = useAuth();
  const { showToast } = useNotificationContext();

  const resolvedUrl = resolveShareUrl(shareUrl);
  const description = shareText || getShareDescription(targetType);
  const canShare = Boolean(resolvedUrl);
  const canReport = Boolean(targetId);

  const handleShare = () => {
    if (!resolvedUrl) return;
    shareContent({ title: shareTitle, text: description, url: resolvedUrl, showToast });
  };

  const handleCopy = () => {
    if (!resolvedUrl) return;
    copyLink(resolvedUrl, showToast);
  };

  const handleReport = () => {
    if (!canReport) return;
    if (isPreviewMode || !user) {
      notifyGuestBlocked(showToast);
      return;
    }
    setReportOpen(true);
  };

  return (
    <>
      <ActionMenu
        onShare={canShare ? handleShare : undefined}
        onCopy={canShare ? handleCopy : undefined}
        onReport={canReport ? handleReport : undefined}
        align={align}
        variant={variant}
        className={className}
      />
      {canReport ? (
        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType={targetType}
          targetId={targetId}
        />
      ) : null}
    </>
  );
}
