import { useNavigate } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { ChevronRight, Newspaper, ICON_SIZES } from '../../constants/icons';
import ProfileSectionCard from './ProfileSectionCard';
import { useAuthorPostCount } from '../../hooks/useAuthorPostCount';

/**
 * LinkedIn-style profile entry point for an author's posts.
 * Loads only the count; the filtered feed opens on a dedicated route.
 */
export default function ProfilePostsSection({
  authorId,
  postsPath,
  enabled = true,
  emptyLabel = 'Aún no hay publicaciones.',
  backTo,
}) {
  const navigate = useNavigate();
  const { count, loading } = useAuthorPostCount(authorId, { enabled: enabled && Boolean(authorId) });

  if (!authorId || !postsPath) return null;

  const title = loading ? 'Publicaciones' : `Publicaciones (${count})`;

  return (
    <ProfileSectionCard title={title} isOwn={false}>
      <button
        type="button"
        onClick={() =>
          navigate(postsPath, {
            state: {
              authorId,
              title: 'Publicaciones',
              from: backTo || undefined,
              emptyDescription: emptyLabel,
            },
          })
        }
        className="flex w-full min-h-touch items-center gap-space-sm rounded-radius-md px-space-xs py-space-sm text-left transition-colors duration-fast hover:bg-app-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-label={title}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-radius-md bg-app-surface ring-1 ring-app-border">
          <AppIcon icon={Newspaper} size={ICON_SIZES.md} className="text-app-text" />
        </span>
        <span className="min-w-0 flex-1">
          {loading ? (
            <span className="block text-body-small text-app-muted">Cargando…</span>
          ) : count > 0 ? (
            <span className="block text-body-small text-app-muted">
              Ver el feed de publicaciones de este perfil
            </span>
          ) : (
            <span className="block text-body-small text-app-muted">{emptyLabel}</span>
          )}
        </span>
        <AppIcon icon={ChevronRight} size={ICON_SIZES.sm} className="shrink-0 text-app-subtle" />
      </button>
    </ProfileSectionCard>
  );
}
