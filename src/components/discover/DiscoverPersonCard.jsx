import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Button from '../ui/Button';
import AppAvatar from '../common/AppAvatar';
import { AvatarType } from '../../constants/avatarDefaults';
import { AUTHOR_TYPES } from '../../constants/authorTypes';
import { getUserProfilePath } from '../../utils/profileRoutes';

export default function DiscoverPersonCard({ person }) {
  if (!person?.user_id) return null;

  const profilePath = getUserProfilePath(person.user_id, AUTHOR_TYPES.PERSONAL);
  if (!profilePath) return null;

  const name = person.full_name?.trim() || 'Profesional';
  const headline = person.headline?.trim() || '';

  return (
    <Link
      to={profilePath}
      className="group block rounded-radius-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      aria-label={`Ver perfil de ${name}`}
    >
      <Card
        elevation={1}
        className="flex items-center gap-space-base p-space-md transition-all duration-fast ease-out group-hover:border-primary-200 group-hover:bg-primary-50/40 group-active:scale-[0.99]"
      >
        <AppAvatar
          type={AvatarType.PERSONAL}
          src={person.avatar_path}
          name={name}
          alt={name}
          size="md"
          variant="circular"
          className="!h-12 !w-12 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-app-text text-user-content">{name}</p>
          {headline ? (
            <p className="mt-0.5 line-clamp-2 text-caption leading-relaxed text-app-subtle text-user-content">
              {headline}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="pointer-events-none shrink-0 !min-h-0"
          tabIndex={-1}
          aria-hidden="true"
        >
          Ver perfil
        </Button>
      </Card>
    </Link>
  );
}
