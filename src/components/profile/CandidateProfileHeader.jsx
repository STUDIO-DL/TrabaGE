import { useRef } from 'react';
import AppAvatar from '../common/AppAvatar';
import AppIcon from '../common/AppIcon';
import { AvatarType } from '../../constants/avatarDefaults';
import { ROLES } from '../../constants/roles';
import { Briefcase, Building2, Camera, GraduationCap, MapPin, Pencil, ICON_SIZES } from '../../constants/icons';
import {
  profileBannerGradientClass,
  profileCoverOverlayClass,
} from '../company/profile/companyProfileStyles';
import { formatYearsLabel, hasYearsExperience } from './ProfileHeroFields';
import {
  formatCurrentPosition,
  formatLocation,
  getCurrentExperience,
  getIntroEducationLine,
} from '../../utils/profileIntro';
import { getDisplayName } from '../../utils/displayIdentity';
import { useAuth } from '../../hooks/useAuth';

export default function CandidateProfileHeader({
  profile,
  isOwn = false,
  onAvatarChange,
  avatarLoading = false,
  coverSrc,
  onEditIntro,
}) {
  const { user, role } = useAuth();
  const avatarInputRef = useRef(null);

  const displayName = getDisplayName(profile, role ?? ROLES.PERSONAL, {
    user: isOwn ? user : null,
    context: 'candidate_profile_header',
    warnIfMissing: isOwn,
  });
  const educationLine = getIntroEducationLine(profile);
  const locationText = formatLocation(profile);
  const currentPosition = formatCurrentPosition(getCurrentExperience(profile?.experience));
  const showYearsBadge = hasYearsExperience(profile?.years_experience);
  const sector = profile?.sector?.trim();
  const headline = profile?.headline?.trim();

  return (
    <section className="overflow-visible border-b border-app-border bg-app-card">
      <div className="relative overflow-visible">
        <div className="relative h-28 overflow-hidden sm:h-32 md:h-36">
          {coverSrc ? (
            <img src={coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className={profileBannerGradientClass} aria-hidden />
          )}

          <div className={profileCoverOverlayClass} aria-hidden />
        </div>

        <div className="relative px-space-base pb-space-md">
          <div className="absolute left-space-base z-10 -top-9 sm:-top-14">
            <div className="relative">
              <div className="rounded-radius-circular bg-app-card p-0.5 ring-4 ring-app-card shadow-elevation-2">
                <AppAvatar
                  type={AvatarType.PERSONAL}
                  src={profile?.avatar_path}
                  name={displayName}
                  alt={displayName}
                  size="xl"
                  className="sm:!h-[7rem] sm:!w-[7rem]"
                />
              </div>

              {isOwn && onAvatarChange && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onAvatarChange(file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    disabled={avatarLoading}
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label="Cambiar foto de perfil"
                    className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-radius-circular bg-primary-600 text-white shadow-elevation-1 ring-2 ring-app-card transition-colors duration-fast hover:bg-primary-700 disabled:opacity-60"
                  >
                    {avatarLoading ? (
                      <span className="text-xs font-medium">…</span>
                    ) : (
                      <AppIcon icon={Camera} size={ICON_SIZES.default} className="text-white" />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="min-w-0 pt-10 sm:pt-14">
            <div className="flex items-start gap-space-sm">
              <div className="min-w-0 flex-1">
                {displayName ? (
                  <h1 className="text-title font-bold leading-tight text-app-text sm:text-heading-m">
                    {displayName}
                  </h1>
                ) : isOwn ? (
                  <button
                    type="button"
                    onClick={onEditIntro}
                    className="text-left text-title font-bold leading-tight text-app-subtle hover:text-primary-600"
                  >
                    Añade tu nombre
                  </button>
                ) : null}
              </div>

              {isOwn && onEditIntro && displayName && (
                <button
                  type="button"
                  onClick={onEditIntro}
                  className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm text-app-muted transition-colors duration-fast hover:bg-app-surface"
                  aria-label="Editar intro"
                >
                  <AppIcon icon={Pencil} size={ICON_SIZES.md} />
                </button>
              )}
            </div>

            {headline ? (
              <p className="mt-space-xs text-body-small text-app-muted sm:text-body">{headline}</p>
            ) : null}

            {currentPosition ? (
              <p className="mt-space-xs flex items-start gap-1.5 text-caption text-app-muted">
                <AppIcon icon={Briefcase} size={ICON_SIZES.default} className="mt-0.5 shrink-0" />
                <span>{currentPosition}</span>
              </p>
            ) : null}

            {sector ? (
              <p className="mt-space-xs flex items-start gap-1.5 text-caption text-app-muted">
                <AppIcon icon={Building2} size={ICON_SIZES.default} className="mt-0.5 shrink-0" />
                <span>{sector}</span>
              </p>
            ) : null}

            {educationLine ? (
              <p className="mt-space-xs flex items-start gap-1.5 text-caption text-app-muted">
                <AppIcon icon={GraduationCap} size={ICON_SIZES.default} className="mt-0.5 shrink-0" />
                <span>{educationLine}</span>
              </p>
            ) : null}

            {locationText ? (
              <p className="mt-space-sm flex items-center gap-1.5 text-caption text-app-muted">
                <AppIcon icon={MapPin} size={ICON_SIZES.default} className="shrink-0" />
                {locationText}
              </p>
            ) : null}

            {showYearsBadge && formatYearsLabel(profile?.years_experience) ? (
              <ul className="mt-space-sm flex flex-wrap gap-space-sm">
                <li className="inline-flex items-center gap-1.5 rounded-radius-full border border-app-border bg-app-surface px-3 py-1.5 text-caption text-app-muted">
                  <AppIcon icon={Briefcase} size={ICON_SIZES.default} className="shrink-0" />
                  {formatYearsLabel(profile?.years_experience)}
                </li>
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
