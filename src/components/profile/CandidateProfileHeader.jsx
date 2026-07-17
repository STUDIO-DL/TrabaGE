import { useRef } from 'react';
import AppAvatar from '../common/AppAvatar';
import AppIcon from '../common/AppIcon';
import { AvatarType } from '../../constants/avatarDefaults';
import { Camera, GraduationCap, MapPin, Pencil, ICON_SIZES } from '../../constants/icons';
import { CITIES } from '../../constants/cities';
import {
  profileBannerGradientClass,
  profileCoverOverlayClass,
} from '../company/profile/companyProfileStyles';
import {
  EditableHeroField,
  EditableHeroSelect,
  EditableHeroYearsBadge,
  EMPTY,
  hasYearsExperience,
} from './ProfileHeroFields';

function getEducationLine(education = []) {
  if (!education?.length) return null;

  const sorted = [...education].sort((a, b) => {
    if (a.is_current && !b.is_current) return -1;
    if (!a.is_current && b.is_current) return 1;
    const aDate = a.end_date || a.start_date || '';
    const bDate = b.end_date || b.start_date || '';
    return bDate.localeCompare(aDate);
  });

  const item = sorted[0];
  if (!item?.institution?.trim()) return null;

  const parts = [item.institution.trim()];
  if (item.program?.trim()) parts.push(item.program.trim());
  return parts.join(' · ');
}

function formatLocation(profile) {
  const parts = [profile?.city, profile?.country].filter(Boolean);
  if (parts.length) return parts.join(', ');
  return null;
}

export default function CandidateProfileHeader({
  profile,
  isOwn = false,
  onAvatarChange,
  avatarLoading = false,
  onCoverChange,
  coverLoading = false,
  coverSrc,
  onSaveField,
  savingField,
}) {
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const nameFieldRef = useRef(null);

  const cityOptions = CITIES.map((city) => ({ value: city, label: city }));
  const educationLine = getEducationLine(profile?.education);
  const locationText = formatLocation(profile);
  const showYearsBadge = hasYearsExperience(profile?.years_experience) || isOwn;
  const canEdit = isOwn;

  const handleCoverChange = (event) => {
    const file = event.target.files?.[0];
    if (file) onCoverChange?.(file);
    event.target.value = '';
  };

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

          {canEdit && (
            <>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={coverLoading || !onCoverChange}
                onChange={handleCoverChange}
              />
              <button
                type="button"
                disabled={coverLoading || !onCoverChange}
                onClick={() => coverInputRef.current?.click()}
                className="absolute right-space-sm top-space-sm z-20 inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-sm bg-black/25 p-space-sm text-white backdrop-blur-sm transition-colors duration-fast hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
                aria-label="Editar portada"
              >
                <AppIcon icon={Pencil} size={ICON_SIZES.md} />
              </button>
            </>
          )}
        </div>

        <div className="relative px-space-base pb-space-md">
          <div className="absolute left-space-base z-10 -top-9 sm:-top-14">
            <div className="relative">
              <div className="rounded-radius-circular bg-app-card p-0.5 ring-4 ring-app-card shadow-elevation-2">
                <AppAvatar
                  type={AvatarType.PERSONAL}
                  src={profile?.avatar_path}
                  name={profile?.full_name}
                  alt={profile?.full_name}
                  size="xl"
                  className="sm:!h-[7rem] sm:!w-[7rem]"
                />
              </div>

              {canEdit && onAvatarChange && (
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
                <EditableHeroField
                  ref={nameFieldRef}
                  as="h1"
                  value={profile?.full_name}
                  placeholder={EMPTY.name}
                  isOwn={canEdit}
                  hideEditButton
                  saving={savingField === 'full_name'}
                  onSave={(v) => onSaveField?.('full_name', v)}
                  displayClassName="text-title font-bold leading-tight text-app-text sm:text-heading-m"
                  inputClassName="text-title font-bold"
                />
              </div>

              {canEdit && onSaveField && (
                <button
                  type="button"
                  onClick={() => nameFieldRef.current?.startEditing()}
                  className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm text-app-muted transition-colors duration-fast hover:bg-app-surface"
                  aria-label="Editar perfil"
                >
                  <AppIcon icon={Pencil} size={ICON_SIZES.md} />
                </button>
              )}
            </div>

            <div className="mt-space-xs">
              <EditableHeroField
                as="p"
                value={profile?.headline}
                placeholder={EMPTY.headline}
                isOwn={canEdit}
                saving={savingField === 'headline'}
                onSave={(v) => onSaveField?.('headline', v)}
                displayClassName="text-body-small text-app-muted sm:text-body"
                inputClassName="text-body-small"
              />
            </div>

            {educationLine ? (
              <p className="mt-space-xs flex items-start gap-1.5 text-caption text-app-muted">
                <AppIcon icon={GraduationCap} size={ICON_SIZES.default} className="mt-0.5 shrink-0" />
                <span>{educationLine}</span>
              </p>
            ) : null}

            <div className="mt-space-sm">
              {canEdit ? (
                <EditableHeroSelect
                  value={profile?.city || ''}
                  placeholder={EMPTY.city}
                  isOwn={canEdit}
                  saving={savingField === 'city'}
                  onSave={(v) => onSaveField?.('city', v)}
                  options={cityOptions}
                  formatDisplay={(v) => {
                    const base = v || EMPTY.city;
                    return profile?.country ? `${base}, ${profile.country}` : base;
                  }}
                  icon={MapPin}
                />
              ) : locationText ? (
                <p className="flex items-center gap-1.5 text-caption text-app-muted">
                  <AppIcon icon={MapPin} size={ICON_SIZES.default} className="shrink-0" />
                  {locationText}
                </p>
              ) : null}
            </div>

            {showYearsBadge && (
              <ul className="mt-space-sm flex flex-wrap gap-space-sm">
                <EditableHeroYearsBadge
                  value={profile?.years_experience}
                  isOwn={canEdit}
                  saving={savingField === 'years_experience'}
                  onSave={(v) => onSaveField?.('years_experience', v)}
                />
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
