import { Link } from 'react-router-dom';
import { Briefcase, Building2, Landmark, Loader2, User } from 'lucide-react';
import AppAvatar from '../common/AppAvatar';
import AppIcon from '../common/AppIcon';
import { AvatarType, avatarTypeFromSearchEntity } from '../../constants/avatarDefaults';
import {
  SEARCH_ENTITY_TYPE_LABELS,
  groupSearchResults,
} from '../../utils/globalSearch';
import { resolveSearchResultPath } from '../../utils/profileRoutes';
import { useAuth } from '../../hooks/useAuth';
import { ICON_SIZES } from '../../constants/icons';
import SearchSelfBadge from './SearchSelfBadge';
import { useIsSearchSelf } from './useIsSearchSelf';

const ENTITY_ICONS = {
  personal: User,
  business: Building2,
  organization: Landmark,
  candidate: User,
  company: Building2,
  institution: Landmark,
  job: Briefcase,
};

function isOrgType(type) {
  return (
    type === 'business' ||
    type === 'organization' ||
    type === 'company' ||
    type === 'institution' ||
    type === 'job'
  );
}

function SearchResultRow({ item, path, onSelect }) {
  const Icon = ENTITY_ICONS[item.type] || User;
  const avatarType = avatarTypeFromSearchEntity(item.type);
  const isSelf = useIsSearchSelf(item);

  return (
    <Link
      to={path}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect?.(item)}
      className={[
        'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none',
        isSelf ? 'bg-primary-50/70' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <AppAvatar
        type={avatarType}
        src={item.avatar_path}
        name={item.title}
        alt={isSelf ? 'Tú' : item.title}
        size="sm"
        variant={avatarType === AvatarType.PERSONAL ? 'circular' : 'rounded'}
        className={isOrgType(item.type) ? '!rounded-xl' : ''}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-medium text-gray-900">{isSelf ? 'Tú' : item.title}</span>
          {isSelf ? <SearchSelfBadge /> : null}
          <AppIcon icon={Icon} size={ICON_SIZES.sm} className="shrink-0 text-gray-400" />
        </span>
        {isSelf ? (
          <span className="mt-0.5 block truncate text-xs text-gray-500">{item.title}</span>
        ) : null}
        {!isSelf && item.subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-gray-500">{item.subtitle}</span>
        ) : null}
        {isSelf && item.subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-gray-400">{item.subtitle}</span>
        ) : null}
        <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide text-primary-600">
          {isSelf ? 'Tu perfil' : (SEARCH_ENTITY_TYPE_LABELS[item.type] ?? 'Resultado')}
        </span>
      </span>
    </Link>
  );
}

export default function GlobalSearchResults({
  query = '',
  results = [],
  loading = false,
  onSelect,
  className = '',
  listId,
}) {
  const { user, role } = useAuth();
  const viewer = user ? { id: user.id, role } : null;
  const trimmedQuery = query.trim();
  const groups = groupSearchResults(results);

  if (!trimmedQuery) {
    return null;
  }

  return (
    <div
      id={listId}
      className={[
        'absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl',
        className,
      ].join(' ')}
      role="listbox"
      aria-label="Resultados de búsqueda"
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Buscando…
        </div>
      ) : groups.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-gray-500">
          No se encontraron resultados.
        </p>
      ) : (
        <div className="max-h-[min(70vh,28rem)] overflow-y-auto py-1">
          {groups.map((group) => (
            <section key={group.type} aria-label={group.label}>
              <h3 className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {group.label}
              </h3>
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
      )}
    </div>
  );
}
