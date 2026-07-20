import ProfileSectionCard from './ProfileSectionCard';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';

/** Read-only languages block for public profiles and main content area. */
export default function LanguagesReadOnlySection({ items = [] }) {
  if (!items.length) return null;

  return (
    <ProfileSectionCard
      icon={PROFILE_SECTION_ICONS.language}
      iconTone="language"
      title="Idiomas"
      isOwn={false}
      isEmpty={false}
    >
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-2 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
            <span className="text-sm font-medium text-gray-900">{item.language}</span>
            {item.level ? <span className="text-xs text-gray-500">{item.level}</span> : null}
          </li>
        ))}
      </ul>
    </ProfileSectionCard>
  );
}
