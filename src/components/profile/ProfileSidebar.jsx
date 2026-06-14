import { formatDate } from '../../utils/formatDate';
import { IconGlobe, IconMail, IconUser } from './ProfileIcons';

export default function ProfileSidebar({ profile, email }) {
  const languages = profile?.languages ?? [];
  const memberSince = profile?.created_at ? formatDate(profile.created_at) : null;

  return (
    <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <dl className="space-y-5">
        <div>
          <dt className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <IconMail className="h-4 w-4 text-primary-600" />
            Correo electrónico
          </dt>
          <dd className="text-sm text-gray-500">{email || 'No especificado'}</dd>
        </div>

        <div>
          <dt className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <IconGlobe className="h-4 w-4 text-primary-600" />
            Idiomas
          </dt>
          <dd className="space-y-1">
            {languages.length > 0 ? (
              languages.map((item) => (
                <p key={item.id} className="text-sm text-gray-600">
                  {item.language}
                  {item.level ? ` (${item.level})` : ''}
                </p>
              ))
            ) : (
              <p className="text-sm text-gray-400">No especificado</p>
            )}
          </dd>
        </div>

        <div>
          <dt className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <IconUser className="h-4 w-4 text-primary-600" />
            Miembro desde
          </dt>
          <dd className="text-sm text-gray-500">{memberSince || 'No especificado'}</dd>
        </div>
      </dl>
    </aside>
  );
}
