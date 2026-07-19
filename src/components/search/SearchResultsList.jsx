import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AppAvatar from '../common/AppAvatar';
import { AvatarType, avatarTypeFromSearchEntity } from '../../constants/avatarDefaults';
import { groupSearchResults } from '../../utils/globalSearch';
import { resolveSearchResultPath } from '../../utils/profileRoutes';
import { useAuth } from '../../hooks/useAuth';
import SearchSelfBadge from './SearchSelfBadge';
import { useIsSearchSelf } from './useIsSearchSelf';

function isOrgType(type) {
  return (
    type === 'business' ||
    type === 'organization' ||
    type === 'company' ||
    type === 'institution'
  );
}

function SearchResultRow({ item, path, onSelect }) {
  const avatarType = avatarTypeFromSearchEntity(item.type);
  const isSelf = useIsSearchSelf(item);
  const isJob = item.type === 'job';
  const secondary = item.secondary ?? null;
  const location = item.location ?? null;

  return (
    <Link
      to={path}
      onClick={() => onSelect?.(item)}
      className={[
        'flex w-full items-center gap-space-md border-b border-app-border px-space-base py-space-md text-left transition-colors duration-fast last:border-b-0 hover:bg-app-surface focus-visible:bg-app-surface focus-visible:outline-none',
        isSelf ? 'bg-primary-50/60' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <AppAvatar
        type={avatarType}
        src={item.avatar_path}
        name={item.title}
        alt={isSelf ? 'Tú' : item.title}
        size="md"
        variant={avatarType === AvatarType.PERSONAL ? 'circular' : 'rounded'}
        className={isOrgType(item.type) || isJob ? '!rounded-radius-md shrink-0' : 'shrink-0'}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-space-xs">
          <span className="truncate text-body-small font-semibold text-app-text">
            {isSelf ? 'Tú' : item.title}
          </span>
          {isSelf ? <SearchSelfBadge /> : null}
        </span>
        {isSelf ? (
          <span className="mt-0.5 block truncate text-caption text-app-muted">{item.title}</span>
        ) : null}
        {secondary ? (
          <span className="mt-0.5 block truncate text-caption text-app-muted">{secondary}</span>
        ) : null}
        {location ? (
          <span className="mt-0.5 block truncate text-caption text-app-subtle">{location}</span>
        ) : null}
      </span>
    </Link>
  );
}

export default function SearchResultsList({
  query = '',
  results = [],
  loading = false,
  error = null,
  onSelect,
  className = '',
}) {
  const { user, role } = useAuth();
  const viewer = user ? { id: user.id, role } : null;
  const trimmedQuery = query.trim();
  const groups = groupSearchResults(results);

  if (!trimmedQuery) {
    return null;
  }

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center gap-space-sm px-space-base py-space-2xl text-body-small text-app-muted ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Buscando…
      </div>
    );
  }

  if (error) {
    return (
      <p
        className={`px-space-base py-space-2xl text-center text-body-small text-error-700 ${className}`}
        role="alert"
      >
        No se pudo completar la búsqueda. Inténtalo de nuevo.
      </p>
    );
  }

  if (groups.length === 0) {
    return (
      <p className={`px-space-base py-space-2xl text-center text-body-small text-app-muted ${className}`}>
        No se encontraron resultados para &ldquo;{trimmedQuery}&rdquo;.
      </p>
    );
  }

  return (
    <div className={className} role="listbox" aria-label="Resultados de búsqueda">
      {groups.map((group) => (
        <section key={group.type} aria-label={group.label}>
          <h2 className="sticky top-0 z-10 border-b border-app-border bg-app-surface px-space-base py-space-sm text-caption font-semibold uppercase tracking-wide text-app-muted">
            {group.label}
          </h2>
          <ul>
            {group.items.map((item) => {
              const path = item.path ?? resolveSearchResultPath(item, viewer);
              return (
                <li key={`${item.type}-${item.id ?? item.result_id}`}>
                  <SearchResultRow item={item} path={path} onSelect={onSelect} />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
