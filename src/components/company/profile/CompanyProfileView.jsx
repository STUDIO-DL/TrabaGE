import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ICON_SIZES,
} from '../../../constants/icons';
import AppIcon from '../../common/AppIcon';
import CompanyProfileHeader from './CompanyProfileHeader';
import CompanyProfileTabs from './CompanyProfileTabs';
import CompanyProfileCompleteness from './CompanyProfileCompleteness';
import CompanyAboutSection from './CompanyAboutSection';
import CompanyAboutTabSection from './CompanyAboutTabSection';
import CompanyServicesSection from './CompanyServicesSection';
import CompanyJobsSection from './CompanyJobsSection';
import CompanyInfoRows, { hasVisibleCompanyInfoRows } from './CompanyInfoRows';
import CompanySocialCard, { hasCompanySocialLinks } from './CompanySocialCard';
import CompanyProfileSectionCard from './CompanyProfileSectionCard';
import ProjectsSection from '../../profile/ProjectsSection';
import ProfilePostsSection from '../../profile/ProfilePostsSection';
import ProfileSavedPostsSection from '../../profile/ProfileSavedPostsSection';
import { useAuthorPostCount } from '../../../hooks/useAuthorPostCount';
import { useAuth } from '../../../hooks/useAuth';
import { ROLES, rolePath } from '../../../constants/roles';
import {
  sectionLinkClass,
  profileContentShellClass,
  profileSectionStackClass,
  profileInicioDesktopClass,
  profileInicioMainClass,
  profileInicioAsideClass,
} from './companyProfileStyles';
import { hasCompanyDescription } from '../../../utils/companyProfile';

function InicioHighlightRow({ title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-touch items-center gap-space-sm rounded-radius-md px-space-xs py-space-sm text-left transition-colors duration-fast hover:bg-app-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-body-small font-semibold text-app-text">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-caption text-app-muted">{subtitle}</span>
        ) : null}
      </span>
      <AppIcon icon={ChevronRight} size={ICON_SIZES.sm} className="shrink-0 text-app-subtle" />
    </button>
  );
}

export default function CompanyProfileView({
  profile,
  readOnly = false,
  isOwn = false,
  jobs = [],
  companyId,
  onEditName,
  onEditIntro,
  onEditAbout,
  onEditDetails,
  onUploadLogo,
  onUploadCover,
  onRemoveCover,
  onAddService,
  onDeleteService,
  logoLoading = false,
  logoPhase = null,
  coverLoading = false,
  coverPhase = null,
  showFollowButton = false,
  showBackButton = false,
  isFollowing = false,
  followLoading = false,
  canFollow = true,
  onToggleFollow,
  onMessage,
  messageLoading = false,
  shareUrl,
  shareTitle,
  reportTargetId,
  followerCount = 0,
  onSettings,
  onAddProject,
  onEditProject,
  onDeleteProject,
}) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('inicio');

  const activeJobCount = useMemo(
    () => jobs.filter((job) => job.status === 'active').length,
    [jobs],
  );
  const services = profile?.company_services ?? [];
  const hasServices = services.length > 0;
  const showFollowerCount = readOnly || isOwn;
  const showPublicActions =
    readOnly && Boolean(showFollowButton || onMessage || shareUrl || reportTargetId);

  const { count: postsCount, loading: postsCountLoading } = useAuthorPostCount(companyId, {
    enabled: Boolean(companyId),
  });

  const postsPath = useMemo(() => {
    if (!companyId) return null;
    if (isOwn && !readOnly) {
      return rolePath(role || ROLES.BUSINESS, '/profile/posts');
    }
    return `/companies/${companyId}/posts`;
  }, [companyId, isOwn, readOnly, role]);

  const openAuthorPosts = () => {
    if (!postsPath) return;
    navigate(postsPath, {
      state: {
        authorId: companyId,
        title: 'Publicaciones',
        from: readOnly ? `/companies/${companyId}` : rolePath(role || ROLES.BUSINESS, '/profile'),
        emptyDescription: 'Aún no hay publicaciones.',
      },
    });
  };

  const goToTab = (tabId) => {
    if (tabId === 'publicaciones') {
      openAuthorPosts();
      return;
    }
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showAboutOnInicio =
    hasCompanyDescription(profile) || profile?.mission?.trim() || profile?.vision?.trim();
  const showInfoCard = hasVisibleCompanyInfoRows(profile, 'inicio');
  const showSocialCard = hasCompanySocialLinks(profile) || !readOnly;
  const projects = profile?.projects ?? [];
  const showProjectsSection = projects.length > 0 || !readOnly;
  const showServiciosTab = hasServices || !readOnly;

  const jobsHighlightSubtitle =
    activeJobCount > 0
      ? activeJobCount === 1
        ? '1 oferta activa'
        : `${activeJobCount} ofertas activas`
      : readOnly
        ? 'Sin ofertas activas por ahora'
        : 'Publica tu primera oferta';

  const servicesHighlightSubtitle =
    hasServices
      ? services.length === 1
        ? '1 servicio'
        : `${services.length} servicios`
      : 'Añade los servicios que ofreces';

  const postsHighlightSubtitle = postsCountLoading
    ? 'Cargando…'
    : postsCount > 0
      ? postsCount === 1
        ? '1 publicación'
        : `${postsCount} publicaciones`
      : isOwn
        ? 'Aún no has publicado nada.'
        : 'Aún no hay publicaciones.';

  let tabPanel = null;

  if (activeTab === 'inicio') {
    tabPanel = (
      <div
        className={`${profileContentShellClass} ${profileSectionStackClass}`}
        role="tabpanel"
        aria-label="Inicio"
      >
        <div
          className={
            showInfoCard || showSocialCard ? profileInicioDesktopClass : profileInicioMainClass
          }
        >
          <div className={profileInicioMainClass}>
            {showAboutOnInicio ? (
              <CompanyProfileSectionCard
                title="Acerca de"
                action={
                  !readOnly && onEditAbout ? (
                    <button type="button" onClick={onEditAbout} className={sectionLinkClass}>
                      Editar
                    </button>
                  ) : (
                    <button type="button" onClick={() => goToTab('acerca')} className={sectionLinkClass}>
                      Ver más
                    </button>
                  )
                }
              >
                <CompanyAboutSection
                  profile={profile}
                  readOnly={readOnly}
                  onEditAbout={onEditAbout}
                  expanded={aboutExpanded}
                  onToggleExpand={() => setAboutExpanded((value) => !value)}
                  onViewMore={() => goToTab('acerca')}
                  compact
                  embedded
                />
              </CompanyProfileSectionCard>
            ) : null}

            {showProjectsSection ? (
              <ProjectsSection
                items={projects}
                isOwn={!readOnly}
                onAdd={onAddProject}
                onEdit={onEditProject}
                onDelete={onDeleteProject}
              />
            ) : null}

            {companyId && postsPath ? (
              <ProfilePostsSection
                authorId={companyId}
                postsPath={postsPath}
                backTo={
                  readOnly
                    ? `/companies/${companyId}`
                    : rolePath(role || ROLES.BUSINESS, '/profile')
                }
                enabled={Boolean(companyId)}
              />
            ) : null}

            {isOwn && !readOnly ? (
              <ProfileSavedPostsSection
                savedPath={rolePath(role || ROLES.BUSINESS, '/profile/saved')}
                backTo={rolePath(role || ROLES.BUSINESS, '/profile')}
                enabled
              />
            ) : null}

            <CompanyProfileSectionCard title="Explorar">
              <div className="divide-y divide-app-divider">
                <InicioHighlightRow
                  title="Empleos"
                  subtitle={jobsHighlightSubtitle}
                  onClick={() => goToTab('empleos')}
                />
                <InicioHighlightRow
                  title={postsCountLoading ? 'Publicaciones' : `Publicaciones (${postsCount})`}
                  subtitle={postsHighlightSubtitle}
                  onClick={openAuthorPosts}
                />
                {showServiciosTab ? (
                  <InicioHighlightRow
                    title="Servicios"
                    subtitle={servicesHighlightSubtitle}
                    onClick={() => goToTab('servicios')}
                  />
                ) : null}
                <InicioHighlightRow
                  title="Acerca de"
                  subtitle="Misión, visión e información"
                  onClick={() => goToTab('acerca')}
                />
              </div>
            </CompanyProfileSectionCard>
          </div>

          {showInfoCard || showSocialCard ? (
            <aside className={profileInicioAsideClass}>
              {showInfoCard ? (
                <CompanyProfileSectionCard title="Información">
                  <CompanyInfoRows
                    profile={profile}
                    variant="inicio"
                    companyId={companyId}
                    trackClicks={readOnly}
                  />
                </CompanyProfileSectionCard>
              ) : null}

              {showSocialCard ? (
                <CompanyProfileSectionCard title="Redes sociales">
                  <CompanySocialCard
                    profile={profile}
                    readOnly={readOnly}
                    onAddSocial={onEditDetails}
                    compact
                    embedded
                  />
                </CompanyProfileSectionCard>
              ) : null}
            </aside>
          ) : null}
        </div>
      </div>
    );
  } else if (activeTab === 'empleos') {
    tabPanel = (
      <div
        className={`${profileContentShellClass} ${profileSectionStackClass}`}
        role="tabpanel"
        aria-label="Empleos"
      >
        <CompanyProfileSectionCard title="Ofertas de empleo">
          <CompanyJobsSection
            jobs={jobs}
            readOnly={readOnly}
            profile={profile}
            variant="full"
            showTitle={false}
            embedded
          />
        </CompanyProfileSectionCard>
      </div>
    );
  } else if (activeTab === 'acerca') {
    tabPanel = (
      <div role="tabpanel" aria-label="Acerca de">
        <CompanyAboutTabSection
          profile={profile}
          readOnly={readOnly}
          onEditAbout={onEditAbout}
          onEditDetails={onEditDetails}
          companyId={companyId}
        />
      </div>
    );
  } else if (activeTab === 'servicios' && showServiciosTab) {
    tabPanel = (
      <div
        className={`${profileContentShellClass} ${profileSectionStackClass}`}
        role="tabpanel"
        aria-label="Servicios"
      >
        <CompanyProfileSectionCard title="Servicios">
          <CompanyServicesSection
            items={services}
            readOnly={readOnly}
            onAdd={onAddService}
            onDelete={onDeleteService}
            embedded
          />
        </CompanyProfileSectionCard>
      </div>
    );
  }

  return (
    <div className="min-w-0 bg-app-surface">
      <CompanyProfileHeader
        profile={profile}
        readOnly={readOnly}
        showBackButton={showBackButton}
        onEditName={onEditName}
        onEditIntro={onEditIntro}
        onUploadLogo={onUploadLogo}
        onUploadCover={onUploadCover}
        onRemoveCover={onRemoveCover}
        logoLoading={logoLoading}
        logoPhase={logoPhase}
        coverLoading={coverLoading}
        coverPhase={coverPhase}
        followerCount={followerCount}
        showFollowerCount={showFollowerCount}
        onSettings={onSettings}
        showActions={showPublicActions}
        showFollow={showFollowButton}
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

      {isOwn && !readOnly ? (
        <CompanyProfileCompleteness profile={profile} jobCount={activeJobCount} />
      ) : null}

      <CompanyProfileTabs
        activeTab={activeTab}
        onTabChange={goToTab}
        hasServices={showServiciosTab}
      />

      {tabPanel}
    </div>
  );
}
