import { formatDate } from '../../utils/formatDate';
import { profileSectionCardClass } from './profileLayoutClasses';

/**
 * Desktop secondary rail for candidate profiles.
 * Hidden below lg (see CandidateProfileLayout). Mobile keeps languages in the main stack.
 */
export default function ProfileSidebar({ profile, email, isOwn = false }) {
  const languages = profile?.languages ?? [];
  const skills = profile?.skills ?? [];
  const memberSince = profile?.created_at ? formatDate(profile.created_at) : null;

  const showEmail = isOwn && Boolean(email);
  const showLanguages = languages.length > 0;
  const showSkills = skills.length > 0;
  const showMemberSince = Boolean(memberSince);

  if (!showEmail && !showLanguages && !showSkills && !showMemberSince) return null;

  const previewSkills = skills.slice(0, 12);

  return (
    <div className="space-y-space-md">
      <aside className={profileSectionCardClass}>
        <dl className="space-y-space-md">
          {showEmail ? (
            <div>
              <dt className="mb-space-xs text-caption font-semibold text-app-text">Correo</dt>
              <dd className="break-all text-body-small text-app-muted">{email}</dd>
            </div>
          ) : null}

          {showMemberSince ? (
            <div>
              <dt className="mb-space-xs text-caption font-semibold text-app-text">Miembro desde</dt>
              <dd className="text-body-small text-app-muted">{memberSince}</dd>
            </div>
          ) : null}

          {showLanguages ? (
            <div>
              <dt className="mb-space-sm text-body-small font-semibold text-app-text">Idiomas</dt>
              <dd className="space-y-space-sm">
                {languages.map((item) => (
                  <div key={item.id}>
                    <p className="text-body-small font-medium text-app-text">{item.language}</p>
                    {item.level ? (
                      <p className="mt-0.5 text-caption text-app-muted">{item.level}</p>
                    ) : null}
                  </div>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      </aside>

      {showSkills ? (
        <aside className={profileSectionCardClass}>
          <p className="mb-space-sm text-body-small font-semibold text-app-text">Habilidades</p>
          <div className="flex flex-wrap gap-2">
            {previewSkills.map((item) => (
              <span
                key={item.id}
                className="inline-flex max-w-full rounded-radius-circular border border-app-border bg-app-surface px-3 py-1.5 text-body-small text-app-text"
              >
                <span className="min-w-0 truncate">{item.name}</span>
              </span>
            ))}
          </div>
          {skills.length > previewSkills.length ? (
            <p className="mt-space-sm text-caption text-app-subtle">
              +{skills.length - previewSkills.length} más en el perfil
            </p>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
