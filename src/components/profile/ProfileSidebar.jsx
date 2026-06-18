import { formatDate } from '../../utils/formatDate';
import AppIcon from '../common/AppIcon';
import { Languages, Mail, User, ICON_COLORS, ICON_SIZES } from '../../constants/icons';

export default function ProfileSidebar({ profile, email, isOwn = false }) {
  const languages = profile?.languages ?? [];
  const memberSince = profile?.created_at ? formatDate(profile.created_at) : null;

  const showEmail = isOwn && Boolean(email);
  const showLanguages = isOwn || languages.length > 0;
  const showMemberSince = isOwn || Boolean(memberSince);

  if (!showEmail && !showLanguages && !showMemberSince) return null;

  return (
    <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <dl className="space-y-5">
        {showEmail && (
          <div>
            <dt className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <AppIcon icon={Mail} size={ICON_SIZES.default} className={ICON_COLORS.primary} />
              Correo electrónico
            </dt>
            <dd className="text-sm text-gray-500">{email}</dd>
          </div>
        )}

        {showLanguages && (
          <div>
            <dt className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <AppIcon icon={Languages} size={ICON_SIZES.default} className={ICON_COLORS.primary} />
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
                <p className="text-sm text-gray-400">Sin idiomas registrados.</p>
              )}
            </dd>
          </div>
        )}

        {showMemberSince && (
          <div>
            <dt className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <AppIcon icon={User} size={ICON_SIZES.default} className={ICON_COLORS.primary} />
              Miembro desde
            </dt>
            <dd className="text-sm text-gray-500">{memberSince}</dd>
          </div>
        )}
      </dl>
    </aside>
  );
}
