import { useNavigate } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { ArrowLeft, Share2, ICON_SIZES } from '../../constants/icons';
import ProfileSettingsButton from './ProfileSettingsButton';
import ContentActionMenu from '../common/ContentActionMenu';
import { REPORT_TARGET_TYPES } from '../../constants/reportReasons';
import { topBarInnerClass, topBarOuterClass } from '../layout/TopBar';
import { useAuth } from '../../hooks/useAuth';

function profileBackFallback(getHomePath) {
  return getHomePath?.() || '/explore';
}

export default function ProfilePageShell({
  title,
  backButton = true,
  hideHeader = false,
  onShare,
  shareUrl,
  shareTitle,
  reportTargetId,
  isOwn = false,
  onSettings,
  children,
}) {
  const navigate = useNavigate();
  const { getHomePath } = useAuth();
  const showReportMenu = !isOwn && shareUrl && reportTargetId;

  const handleBack = () => {
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
      return;
    }
    navigate(profileBackFallback(getHomePath), { replace: true });
  };

  return (
    <div className="profile-page min-h-full min-w-0 max-w-full overflow-x-hidden bg-app-surface">
      {!hideHeader && (
      <header className={topBarOuterClass}>
        <div className={topBarInnerClass}>
          {backButton ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm p-space-sm text-app-muted transition-colors duration-fast ease-out hover:bg-app-surface"
              aria-label="Volver"
            >
              <AppIcon icon={ArrowLeft} size={ICON_SIZES.md} />
            </button>
          ) : (
            <div className="min-w-touch shrink-0" aria-hidden="true" />
          )}

          {title ? (
            <h1 className="min-w-0 flex-1 truncate text-center text-subtitle font-semibold text-app-text">
              {title}
            </h1>
          ) : (
            <div className="min-w-0 flex-1" aria-hidden="true" />
          )}

          <div className="flex shrink-0 items-center justify-end gap-space-xs">
            {showReportMenu ? (
              <ContentActionMenu
                shareUrl={shareUrl}
                shareTitle={shareTitle}
                targetType={REPORT_TARGET_TYPES.PROFILE}
                targetId={reportTargetId}
              />
            ) : (
              onShare && (
                <button
                  type="button"
                  onClick={onShare}
                  className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-sm p-space-sm text-app-muted transition-colors duration-fast ease-out hover:bg-app-surface"
                  aria-label="Compartir"
                >
                  <AppIcon icon={Share2} size={ICON_SIZES.default} />
                </button>
              )
            )}
            {isOwn ? <ProfileSettingsButton onClick={onSettings} /> : null}
          </div>
        </div>
      </header>
      )}
      {children}
    </div>
  );
}
