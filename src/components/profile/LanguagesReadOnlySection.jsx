import ProfileSectionCard, { ProfileEntryRow } from './ProfileSectionCard';
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
      <div>
        {items.map((item) => (
          <ProfileEntryRow
            key={item.id}
            title={item.language}
            subtitle={item.level || undefined}
            isOwn={false}
          />
        ))}
      </div>
    </ProfileSectionCard>
  );
}
