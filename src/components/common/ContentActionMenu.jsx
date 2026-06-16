import { useState } from 'react';
import ActionMenu from './ActionMenu';
import ShareMenu from '../feed/ShareMenu';
import ReportModal from './ReportModal';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { notifyGuestBlocked } from '../../utils/guestMode';
import { generateShareUrl } from '../../utils/generateShareUrl';

export default function ContentActionMenu({
  shareUrl,
  shareTitle = 'TrabaGE',
  targetType,
  targetId,
  align = 'right',
  className = '',
  shareMode = 'copy',
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const { isPreviewMode, user } = useAuth();
  const { showToast } = useNotificationContext();

  const resolvedUrl = shareUrl.startsWith('http') ? shareUrl : generateShareUrl(shareUrl);

  const handleShare = async () => {
    if (shareMode === 'panel') {
      setShareOpen((v) => !v);
      return;
    }

    try {
      await navigator.clipboard.writeText(resolvedUrl);
      showToast('Enlace copiado', 'success');
    } catch {
      showToast('No se pudo copiar el enlace', 'error');
    }
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
        onReport={handleReport}
        align={align}
        className={className}
      />
      {shareMode === 'panel' && shareOpen && (
        <ShareMenu url={shareUrl} title={shareTitle} />
      )}
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType={targetType}
        targetId={targetId}
      />
    </>
  );
}
