import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import BrandLogoOwnershipModal from '../BrandLogoOwnershipModal';
import {
  ArrowLeft,
  Camera,
  Pencil,
  Settings,
  ICON_SIZES,
} from '../../../constants/icons';
import CompanyVerificationAction from './CompanyVerificationAction';
import CompanyNameWithBadge from '../CompanyNameWithBadge';
import AppAvatar from '../../common/AppAvatar';
import { avatarTypeFromCompanyProfile } from '../../../constants/avatarDefaults';
import { getCompanyCoverUrl } from '../../../constants/images';
import {
  getCompanyIntroText,
  getCompanySectorText,
  resolveCompanyHeaderName,
} from '../../../utils/companyProfile';
import { formatFollowerNumber } from '../../../utils/formatFollowerCount';
import { useAuth } from '../../../hooks/useAuth';
import { getUploadPhaseLabel } from '../../../constants/uploadPhases';
import { ROLES } from '../../../constants/roles';
import CompanyProfileActionBar from './CompanyProfileActionBar';
import {
  profileBannerGradientClass,
  profileCompanyCoverHeightClass,
  profileCompanyHeaderInfoClass,
  profileCompanyLogoFrameClass,
  profileCompanyLogoOverlapClass,
  profileCompanyNameHeadingClass,
  profileCompanyNameRowClass,
  profileCoverOverlayClass,
  profileFollowerCountClass,
  profileHeaderContentClass,
  profileHeadlineClass,
  profileMetaLineClass,
} from './companyProfileStyles';

function BannerSkyline() {
  return (
    <svg
      className="pointer-events-none absolute bottom-0 right-0 h-[70%] w-[55%] text-white/[0.12] sm:w-[45%]"
      viewBox="0 0 480 220"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M120 220V130h36v90h28V95h32v125h24V70h28v150h40V110h30v110h44V55h26v165h38V88h34v132h52V220H120zm180 0V145h22v75h26V118h24v102h28V92h20v128h32V156h18v64h30V220H300z"
      />
    </svg>
  );
}

function MediaUploadButton({ label, loading, uploadPhase, inputId, className = '' }) {
  return (
    <label
      htmlFor={inputId}
      className={`inline-flex min-h-touch cursor-pointer items-center gap-space-xs rounded-radius-full bg-white/15 px-space-md py-space-xs text-caption font-semibold text-white shadow-elevation-1 ring-1 ring-inset ring-white/40 backdrop-blur transition-colors duration-fast hover:bg-white/25 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${className}`}
    >
      <AppIcon icon={Camera} size={ICON_SIZES.sm} className="text-white" />
      {loading ? getUploadPhaseLabel(uploadPhase) || 'Subiendo…' : label}
    </label>
  );
}

function formatEmployeeCount(size) {
  const trimmed = size?.trim();
  if (!trimmed) return null;
  if (/empleado/i.test(trimmed)) return trimmed;
  return `${trimmed} empleados`;
}

/** LinkedIn-style meta: "Sector · Ciudad · Tamaño" */
function buildHeaderMetaTexts(profile) {
  const sector = getCompanySectorText(profile);
  const city = profile?.city?.trim();
  const country = profile?.country?.trim();
  const location = [city, country].filter(Boolean).join(', ');
  const employees = formatEmployeeCount(profile?.company_size);

  return [sector, location, employees].filter(Boolean);
}

export default function CompanyProfileHeader({
  profile,
  readOnly = false,
  showBackButton = false,
  onEditName,
  onEditIntro,
  onUploadLogo,
  onUploadCover,
  logoLoading = false,
  logoPhase = null,
  coverLoading = false,
  coverPhase = null,
  followerCount = 0,
  showFollowerCount = false,
  onSettings,
  showActions = false,
  showFollow = false,
  isFollowing = false,
  followLoading = false,
  canFollow = true,
  onToggleFollow,
  shareUrl,
  shareTitle,
  reportTargetId,
  onMessage,
  messageLoading = false,
}) {
  const navigate = useNavigate();
  const { role, user, getHomePath } = useAuth();
  const logoInputRef = useRef(null);
  const [logoOwnershipOpen, setLogoOwnershipOpen] = useState(false);
  const coverInputId = 'company-cover-input';

  const name = resolveCompanyHeaderName(profile, { user, role, readOnly });
  const introText = getCompanyIntroText(profile);
  const avatarType = avatarTypeFromCompanyProfile(profile);
  const coverSrc = getCompanyCoverUrl(profile?.cover_url);
  const metaTexts = buildHeaderMetaTexts(profile);

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (file) onUploadLogo?.(file);
    event.target.value = '';
  };

  const handleCoverChange = (event) => {
    const file = event.target.files?.[0];
    if (file) onUploadCover?.(file);
    event.target.value = '';
  };

  const handleBack = () => {
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
      return;
    }
    navigate(getHomePath?.() || '/explore', { replace: true });
  };

  // Avoid overflow-hidden on the section — it clips the ⋯ ActionMenu portal fallback / absolute menus.
  return (
    <section className="border-b border-app-border bg-app-card">
      {/* Cover / banner */}
      <div className={`relative ${profileCompanyCoverHeightClass} overflow-hidden`}>
        {coverSrc ? (
          <img src={coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className={profileBannerGradientClass} aria-hidden />
        )}
        <div className={profileCoverOverlayClass} aria-hidden />
        <BannerSkyline />

        {showBackButton && (
          <button
            type="button"
            onClick={handleBack}
            className="absolute left-space-sm top-space-sm z-20 inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-sm p-space-sm text-white transition-colors duration-fast hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Volver"
          >
            <AppIcon icon={ArrowLeft} size={ICON_SIZES.md} />
          </button>
        )}

        {onSettings && (
          <button
            type="button"
            onClick={onSettings}
            className="absolute right-space-sm top-space-sm z-20 inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-sm p-space-sm text-white transition-colors duration-fast hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Configuración"
          >
            <AppIcon icon={Settings} size={ICON_SIZES.md} />
          </button>
        )}

        {!readOnly && (
          <>
            <input
              id={coverInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={coverLoading}
              onChange={handleCoverChange}
            />
            <MediaUploadButton
              label={coverSrc ? 'Cambiar portada' : 'Añadir portada'}
              inputId={coverInputId}
              loading={coverLoading}
              uploadPhase={coverPhase}
              className="absolute bottom-space-sm right-space-base z-20"
            />
          </>
        )}
      </div>

      <div className={profileHeaderContentClass}>
        {/* Logo overlaps cover */}
        <div className={`relative z-10 flex justify-start ${profileCompanyLogoOverlapClass}`}>
          <div className="relative shrink-0">
            <div className={profileCompanyLogoFrameClass}>
              <AppAvatar
                type={avatarType}
                src={profile?.logo_path}
                name={name}
                alt={name}
                size="2xl"
                variant="rounded"
                className="!rounded-radius-md border-0 bg-app-card"
              />
            </div>

            {!readOnly && (
              <>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <button
                  type="button"
                  onClick={() => setLogoOwnershipOpen(true)}
                  disabled={logoLoading}
                  className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-radius-circular bg-app-card text-app-muted shadow-elevation-1 ring-2 ring-app-card transition-colors duration-fast hover:bg-app-surface hover:text-app-text disabled:opacity-60"
                  aria-label={logoLoading ? getUploadPhaseLabel(logoPhase) || 'Subiendo logo' : 'Subir logo'}
                  title={logoLoading ? getUploadPhaseLabel(logoPhase) || 'Subiendo…' : undefined}
                >
                  {logoLoading ? (
                    <span className="text-[10px] font-semibold">…</span>
                  ) : (
                    <AppIcon icon={Camera} size={ICON_SIZES.sm} />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Identity: name → tagline → meta → followers → actions */}
        <div className={`${profileCompanyHeaderInfoClass} mt-space-md`}>
          <div className={profileCompanyNameRowClass}>
            <div className="min-w-0 flex-1">
              {name ? (
                <CompanyNameWithBadge
                  company={profile}
                  name={name}
                  profile
                  readOnly={readOnly}
                  showOwnerVerificationBadge={!readOnly}
                  linkToProfile={false}
                  nameClassName={profileCompanyNameHeadingClass}
                  className="inline-flex min-w-0 items-center gap-x-1"
                />
              ) : !readOnly ? (
                <button
                  type="button"
                  onClick={onEditName}
                  className={`${profileCompanyNameHeadingClass} text-left text-app-subtle transition-colors hover:text-primary-600`}
                >
                  Añade el nombre de tu cuenta
                </button>
              ) : null}
            </div>

            {!readOnly && name ? (
              <div className="flex shrink-0 items-center gap-space-xs">
                {onEditIntro ? (
                  <button
                    type="button"
                    onClick={onEditIntro}
                    className="inline-flex min-h-touch items-center gap-space-xs rounded-radius-sm px-space-sm text-caption font-medium text-app-muted transition-colors duration-fast hover:bg-app-surface hover:text-primary-600"
                    aria-label="Editar intro"
                    title="Editar intro"
                  >
                    <AppIcon icon={Pencil} size={ICON_SIZES.sm} aria-hidden />
                    <span className="hidden sm:inline">Editar intro</span>
                  </button>
                ) : null}
                {onEditName ? (
                  <button
                    type="button"
                    onClick={onEditName}
                    className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-sm text-app-muted transition-colors duration-fast hover:bg-app-surface hover:text-app-text"
                    aria-label="Editar nombre"
                  >
                    <AppIcon icon={Pencil} size={ICON_SIZES.md} />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {introText ? <p className={profileHeadlineClass}>{introText}</p> : null}

          {!readOnly && !introText && onEditIntro && name ? (
            <button
              type="button"
              onClick={onEditIntro}
              className="mt-space-xs text-left text-body-small text-app-subtle transition-colors duration-fast hover:text-primary-600"
            >
              Añade un eslogan o frase introductoria
            </button>
          ) : null}

          {!readOnly && (
            <div className="mt-space-sm">
              <CompanyVerificationAction company={profile} role={role || ROLES.BUSINESS} />
            </div>
          )}

          {metaTexts.length > 0 ? (
            <p className={`mt-space-sm ${profileMetaLineClass}`}>{metaTexts.join(' · ')}</p>
          ) : null}

          {showFollowerCount && followerCount > 0 ? (
            <p className={profileFollowerCountClass}>
              {formatFollowerNumber(followerCount)}{' '}
              <span className="font-medium text-app-muted">seguidores</span>
            </p>
          ) : null}

          {showActions ? (
            <div className="mt-space-md">
              <CompanyProfileActionBar
                showFollow={showFollow}
                isFollowing={isFollowing}
                followLoading={followLoading}
                canFollow={canFollow}
                onToggleFollow={onToggleFollow}
                shareUrl={shareUrl}
                shareTitle={shareTitle}
                reportTargetId={reportTargetId}
                onMessage={onMessage}
                messageLoading={messageLoading}
              />
            </div>
          ) : null}
        </div>
      </div>

      {!readOnly && (
        <BrandLogoOwnershipModal
          isOpen={logoOwnershipOpen}
          onClose={() => setLogoOwnershipOpen(false)}
          onConfirm={() => {
            setLogoOwnershipOpen(false);
            logoInputRef.current?.click();
          }}
        />
      )}
    </section>
  );
}
