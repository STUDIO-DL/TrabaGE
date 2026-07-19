import { useRef, useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import AppIcon from '../../common/AppIcon';

import BrandLogoOwnershipModal from '../BrandLogoOwnershipModal';

import {

  ArrowLeft,

  Briefcase,

  Camera,

  MapPin,

  Pencil,

  Settings,

  Users,

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

import { ROLES, rolePath } from '../../../constants/roles';

import CompanyProfileActionBar from './CompanyProfileActionBar';

import {

  profileBannerGradientClass,

  profileCompanyHeaderBodyClass,

  profileCompanyHeaderInfoClass,

  profileCompanyLogoFrameClass,

  profileCompanyLogoOverlapClass,

  profileCompanyNameHeadingClass,

  profileCompanyNameRowClass,

  profileCoverHeightClass,

  profileCoverOverlayClass,

  profileHeaderContentClass,

  profileHeadlineClass,

  profileMetaItemClass,

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



function buildHeaderMeta(profile) {

  const sector = getCompanySectorText(profile);

  const city = profile?.city?.trim();

  const country = profile?.country?.trim();

  const location = [city, country].filter(Boolean).join(', ');

  const employees = formatEmployeeCount(profile?.company_size);



  return [

    sector ? { key: 'sector', icon: Briefcase, text: sector } : null,

    location ? { key: 'location', icon: MapPin, text: location } : null,

    employees ? { key: 'size', icon: Users, text: employees } : null,

  ].filter(Boolean);

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

  showActions = false,

  showFollow = false,

  isFollowing = false,

  followLoading = false,

  canFollow = true,

  onToggleFollow,

  onViewJobs,

  hasJobs = false,

  shareUrl,

  shareTitle,

  reportTargetId,

  onContact,

  contactDisabled = false,

  onSettings,

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

  const metaItems = buildHeaderMeta(profile);

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



  return (

    <section className="overflow-hidden border-b border-app-border bg-app-card">

      <div className={`relative ${profileCoverHeightClass} overflow-hidden`}>

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

        <div className={profileCompanyHeaderBodyClass}>

          <div className={`relative z-10 shrink-0 self-start ${profileCompanyLogoOverlapClass}`}>

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

                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-radius-circular bg-app-card text-app-muted shadow-elevation-1 ring-2 ring-app-card transition-colors duration-fast hover:bg-app-surface hover:text-app-text disabled:opacity-60"

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



          <div className={`relative z-20 ${profileCompanyHeaderInfoClass}`}>

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

                  <h1 className={`${profileCompanyNameHeadingClass} text-app-subtle`}>

                    Añade el nombre de tu cuenta

                  </h1>

                ) : null}

              </div>



              {!readOnly && onEditIntro && name ? (

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

              ) : null}



              {!readOnly && onEditName && (

                <button

                  type="button"

                  onClick={onEditName}

                  className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm text-app-muted transition-colors duration-fast hover:bg-app-surface"

                  aria-label="Editar nombre"

                >

                  <AppIcon icon={Pencil} size={ICON_SIZES.md} />

                </button>

              )}

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
              <div className="mt-space-xs">
                <CompanyVerificationAction company={profile} role={role || ROLES.BUSINESS} />
              </div>
            )}



            {metaItems.length > 0 ? (

              <div className="mt-space-sm flex flex-wrap items-center gap-x-space-md gap-y-space-xs">

                {metaItems.map((item) => (

                  <span key={item.key} className={profileMetaItemClass}>

                    <AppIcon icon={item.icon} size={ICON_SIZES.sm} className="shrink-0 text-app-subtle" />

                    <span className="break-words">{item.text}</span>

                  </span>

                ))}

              </div>

            ) : null}



            {showFollowerCount && followerCount > 0 && (

              <p className="mt-space-sm text-caption font-medium tabular-nums text-app-muted">

                {formatFollowerNumber(followerCount)} seguidores

              </p>

            )}



            {showActions && (

              <div className="mt-space-md">

                <CompanyProfileActionBar

                  showFollow={showFollow}

                  isFollowing={isFollowing}

                  followLoading={followLoading}

                  canFollow={canFollow}

                  onToggleFollow={onToggleFollow}

                  onViewJobs={onViewJobs}

                  hasJobs={hasJobs}

                  shareUrl={shareUrl}

                  shareTitle={shareTitle}

                  reportTargetId={reportTargetId}

                  onContact={onContact}

                  contactDisabled={contactDisabled}

                />

              </div>

            )}

          </div>

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

