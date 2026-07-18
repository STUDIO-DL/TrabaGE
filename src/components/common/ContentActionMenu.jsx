import { useState } from 'react';
import ActionMenu from './ActionMenu';
import ReportModal from './ReportModal';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { notifyGuestBlocked } from '../../utils/guestMode';
import { generateShareUrl } from '../../utils/generateShareUrl';
import { shareContent, copyLink, getShareDescription } from '../../utils/shareContent';

export default function ContentActionMenu({
  shareUrl,
  shareTitle = 'TrabaGE',
  shareText,
  targetType,
  targetId,
  align = 'right',
  className = '',
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const { isPreviewMode, user } = useAuth();
  const { showToast } = useNotificationContext();

  const resolvedUrl =
    typeof shareUrl === 'string' && shareUrl.startsWith('http')
      ? shareUrl
      : generateShareUrl(typeof shareUrl === 'string' ? shareUrl : '');
  const description = shareText || getShareDescription(targetType);

  const handleShare = () => {
    shareContent({ title: shareTitle, text: description, url: resolvedUrl, showToast });
  };

  const handleCopy = () => {
    copyLink(resolvedUrl, showToast);
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
      <ActionMenu
        onShare={handleShare}
        onCopy={handleCopy}
        onReport={handleReport}
        align={align}
        className={className}
      />
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType={targetType}
        targetId={targetId}
      />
    </>
  );
}
