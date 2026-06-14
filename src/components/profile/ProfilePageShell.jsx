import { useNavigate } from 'react-router-dom';
import { IconShare } from './ProfileIcons';
import ProfileMenu from './ProfileMenu';

export default function ProfilePageShell({
  title = 'Perfil del candidato',
  backButton = true,
  onShare,
  isOwn = false,
  onSettings,
  onLogout,
  onDeleteAccount,
  children,
}) {
  const navigate = useNavigate();

  return (
    <div className="profile-page min-h-full bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          {backButton ? (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <span aria-hidden>←</span>
              Volver
            </button>
          ) : (
            <div className="w-20" />
          )}

          <h1 className="flex-1 truncate text-center text-base font-semibold text-gray-900">{title}</h1>

          <div className="flex w-20 items-center justify-end gap-1">
            <button
              type="button"
              onClick={onShare}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Compartir"
            >
              <IconShare className="h-5 w-5" />
            </button>
            {isOwn && (
              <ProfileMenu
                onSettings={onSettings}
                onLogout={onLogout}
                onDeleteAccount={onDeleteAccount}
              />
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
