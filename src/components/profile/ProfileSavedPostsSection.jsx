import { useNavigate } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { Bookmark, ChevronRight, ICON_SIZES } from '../../constants/icons';
import ProfileSectionCard from './ProfileSectionCard';
import { useSavedPostCount } from '../../hooks/useSavedPostCount';

/**
 * Private profile entry for saved posts (owner only).
 */
export default function ProfileSavedPostsSection({
  savedPath,
  enabled = true,
  backTo,
}) {
  const navigate = useNavigate();
  const { count, loading } = useSavedPostCount({ enabled: enabled && Boolean(savedPath) });

  if (!savedPath || !enabled) return null;

  const title = loading ? 'Guardados' : `Guardados (${count})`;

  return (
    <ProfileSectionCard title={title} isOwn>
      <button
        type="button"
        onClick={() =>
          navigate(savedPath, {
            state: {
              title: 'Guardados',
              from: backTo || undefined,
            },
          })
        }
        className="flex w-full min-h-touch items-center gap-space-sm rounded-radius-md px-space-xs py-space-sm text-left transition-colors duration-fast hover:bg-app-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-label={title}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-radius-md bg-app-surface ring-1 ring-app-border">
          <AppIcon icon={Bookmark} size={ICON_SIZES.md} className="text-app-text" />
        </span>
        <span className="min-w-0 flex-1">
          {loading ? (
            <span className="block text-body-small text-app-muted">Cargando…</span>
          ) : count > 0 ? (
            <span className="block text-body-small text-app-muted">
              Publicaciones que guardaste para más tarde
            </span>
          ) : (
            <span className="block text-body-small text-app-muted">
              Aún no has guardado publicaciones.
            </span>
          )}
        </span>
        <AppIcon icon={ChevronRight} size={ICON_SIZES.sm} className="shrink-0 text-app-subtle" />
      </button>
    </ProfileSectionCard>
  );
}
