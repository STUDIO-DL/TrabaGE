import AppAvatar from '../common/AppAvatar';
import AppIcon from '../common/AppIcon';
import { AvatarType } from '../../constants/avatarDefaults';
import { getCandidateCoverUrl } from '../../constants/images';
import { ROLES } from '../../constants/roles';
import { Pencil, ICON_SIZES } from '../../constants/icons';
import {
  profileBannerGradientClass,
  profileCoverHeightClass,
  profileCoverOverlayClass,
  profileHeaderBodyClass,
  profileHeaderContentClass,
  profileHeaderInfoClass,
  profileHeadlineClass,
  profileNameHeadingClass,
  profilePersonalAvatarFrameClass,
  profilePersonalAvatarOverlapClass,
} from '../company/profile/companyProfileStyles';
import { formatYearsLabel, hasYearsExperience } from './ProfileHeroFields';
import {
  formatLocation,
  getIntroEducationLine,
} from '../../utils/profileIntro';
import { getDisplayName } from '../../utils/displayIdentity';
import { useAuth } from '../../hooks/useAuth';
import { profileHeaderAlignClass } from './profileLayoutClasses';
import ProfessionalPanelTeaser from '../../features/professional-panel/ui/ProfessionalPanelTeaser';
import CoverEditControl from './CoverEditControl';
import AvatarEditControl from './AvatarEditControl';

export default function CandidateProfileHeader({
  profile,
  isOwn = false,
  onAvatarChange,
  onAvatarRemove,
  avatarLoading = false,
  avatarPhase = null,
  onCoverChange,
  onCoverRemove,
  coverLoading = false,
  coverPhase = null,
  coverSrc: coverSrcProp,
  onEditIntro,
}) {
  const { role } = useAuth();

  const displayName = getDisplayName(profile, role ?? ROLES.PERSONAL, {
    context: 'candidate_profile_header',
    warnIfMissing: isOwn,
    profileOnly: true,
  });
  const educationLine = getIntroEducationLine(profile);
  const locationText = formatLocation(profile);
  const showYearsBadge = hasYearsExperience(profile?.years_experience);
  const sector = profile?.sector?.trim();
  const headline = profile?.headline?.trim();

  const coverSrc = coverSrcProp ?? getCandidateCoverUrl(profile?.cover_path);
  const hasAvatar = Boolean(String(profile?.avatar_path || '').trim());

  return (
    <section className="overflow-hidden border-b border-app-border bg-app-card">
      <div className={`relative ${profileCoverHeightClass} overflow-hidden`}>
        {coverSrc ? (
          <img
            key={coverSrc}
            src={coverSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className={profileBannerGradientClass} aria-hidden />
        )}
        <div className={profileCoverOverlayClass} aria-hidden />

        {isOwn && onCoverChange ? (
          <CoverEditControl
            hasCover={Boolean(coverSrc)}
            loading={coverLoading}
            uploadPhase={coverPhase}
            onReplace={onCoverChange}
            onRemove={onCoverRemove}
          />
        ) : null}
      </div>

      <div className={`${profileHeaderContentClass} lg:px-space-xl`}>
        <div className={profileHeaderAlignClass}>
        <div className={profileHeaderBodyClass}>
          <div className={`relative shrink-0 self-start ${profilePersonalAvatarOverlapClass}`}>
            <div className={profilePersonalAvatarFrameClass}>
              <AppAvatar
                type={AvatarType.PERSONAL}
                src={profile?.avatar_path}
                name={displayName}
                alt={displayName}
                size="xl"
                className="sm:!h-[7.5rem] sm:!w-[7.5rem]"
              />
            </div>

            {isOwn && onAvatarChange ? (
              <AvatarEditControl
                hasPhoto={hasAvatar}
                loading={avatarLoading}
                uploadPhase={avatarPhase}
                onReplace={onAvatarChange}
                onRemove={onAvatarRemove}
              />
            ) : null}
          </div>

          <div className={profileHeaderInfoClass}>
            <div className="flex items-start gap-space-sm">
              <div className="min-w-0 flex-1">
                {displayName ? (
                  <h1 className={profileNameHeadingClass}>{displayName}</h1>
                ) : isOwn ? (
                  <button
                    type="button"
                    onClick={onEditIntro}
                    className="text-left text-heading-l font-semibold leading-snug text-app-subtle hover:text-primary-600"
                  >
                    Añade tu nombre
                  </button>
                ) : null}
              </div>

              {isOwn && onEditIntro && displayName && (
                <button
                  type="button"
                  onClick={onEditIntro}
                  className="inline-flex min-h-touch shrink-0 items-center gap-space-xs rounded-radius-sm px-space-sm text-caption font-medium text-app-muted transition-colors duration-fast hover:bg-app-surface hover:text-primary-600"
                  aria-label="Editar intro"
                  title="Editar intro"
                >
                  <AppIcon icon={Pencil} size={ICON_SIZES.sm} aria-hidden />
                  <span>Editar intro</span>
                </button>
              )}
            </div>

            {headline ? <p className={profileHeadlineClass}>{headline}</p> : null}

            {sector ? (
              <p className="mt-space-xs break-words text-caption text-app-muted">
                {sector}
              </p>
            ) : null}

            {educationLine ? (
              <p className="mt-space-xs break-words text-caption text-app-muted">
                {educationLine}
              </p>
            ) : null}

            {locationText ? (
              <p className="text-user-content mt-space-sm break-words text-caption text-app-muted">
                {locationText}
              </p>
            ) : null}

            {isOwn ? <ProfessionalPanelTeaser /> : null}

            {showYearsBadge && formatYearsLabel(profile?.years_experience) ? (
              <ul className="mt-space-sm flex flex-wrap gap-space-sm">
                <li className="inline-flex items-center rounded-radius-full border border-app-border bg-app-surface px-3 py-1.5 text-caption text-app-muted">
                  {formatYearsLabel(profile?.years_experience)}
                </li>
              </ul>
            ) : null}
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
