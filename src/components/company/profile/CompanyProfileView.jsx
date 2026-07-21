import { useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  ChevronRight,
  Newspaper,
  Share2,
  Wrench,
  ICON_COLORS,
  ICON_SIZES,
  PROFILE_SECTION_ICONS,
} from '../../../constants/icons';
import AppIcon from '../../common/AppIcon';
import { SECTION_ICON_TONES } from '../../profile/ProfileIcons';
import CompanyProfileHeader from './CompanyProfileHeader';
import CompanyProfileTabs from './CompanyProfileTabs';
import CompanyProfileCompleteness from './CompanyProfileCompleteness';
import CompanyAboutSection from './CompanyAboutSection';
import CompanyAboutTabSection from './CompanyAboutTabSection';
import CompanyServicesSection from './CompanyServicesSection';
import CompanyJobsSection from './CompanyJobsSection';
import { CompanyPostsFeed } from './CompanyPostsSection';
import CompanyInfoRows, { hasVisibleCompanyInfoRows } from './CompanyInfoRows';
import CompanySocialCard, { hasCompanySocialLinks } from './CompanySocialCard';
import CompanyProfileSectionCard from './CompanyProfileSectionCard';
import ProjectsSection from '../../profile/ProjectsSection';
import { usePosts } from '../../../hooks/usePosts';
import { usePostMutations } from '../../../hooks/usePostMutations';
import {
  sectionLinkClass,
  profileContentShellClass,
  profileSectionStackClass,
  profileInicioGridClass,
} from './companyProfileStyles';
import { hasCompanyDescription } from '../../../utils/companyProfile';

function InicioHighlightRow({ icon: Icon, iconTone = 'about', title, subtitle, onClick }) {
  const toneClass = SECTION_ICON_TONES[iconTone] ?? SECTION_ICON_TONES.about;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-touch items-center gap-space-sm rounded-radius-md px-space-xs py-space-sm text-left transition-colors duration-fast hover:bg-app-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-radius-md ${toneClass}`}
        aria-hidden
      >
        <AppIcon icon={Icon} size={ICON_SIZES.default} className={ICON_COLORS.default} />
      </span>
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
  const shouldLoadPosts = activeTab === 'publicaciones';

  const {
    posts,
    loading: postsLoading,
    loadingMore: postsLoadingMore,
    hasMore: postsHasMore,
    loadMore: loadMorePosts,
    refetch: refetchPosts,
  } = usePosts(companyId, { enabled: shouldLoadPosts });

  const canManagePosts = isOwn && !readOnly;
  const { handleEdit: handleEditPost, handleDelete: handleDeletePost } = usePostMutations({
    onSuccess: refetchPosts,
  });

  const goToTab = (tabId) => {
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

  let tabPanel = null;

  if (activeTab === 'inicio') {
    tabPanel = (
      <div
        className={`${profileContentShellClass} ${profileSectionStackClass}`}
        role="tabpanel"
        aria-label="Inicio"
      >
        <div className={profileInicioGridClass}>
          {showAboutOnInicio ? (
            <CompanyProfileSectionCard
              title="Acerca de"
              icon={PROFILE_SECTION_ICONS.about}
              iconTone="about"
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

          <CompanyProfileSectionCard title="Explorar" icon={Building2} iconTone="about">
            <div className="divide-y divide-app-divider">
              <InicioHighlightRow
                icon={Briefcase}
                iconTone="experience"
                title="Empleos"
                subtitle={jobsHighlightSubtitle}
                onClick={() => goToTab('empleos')}
              />
              <InicioHighlightRow
                icon={Newspaper}
                iconTone="document"
                title="Publicaciones"
                subtitle="Ver el feed de la empresa"
                onClick={() => goToTab('publicaciones')}
              />
              {showServiciosTab ? (
                <InicioHighlightRow
                  icon={Wrench}
                  iconTone="service"
                  title="Servicios"
                  subtitle={servicesHighlightSubtitle}
                  onClick={() => goToTab('servicios')}
                />
              ) : null}
              <InicioHighlightRow
                icon={PROFILE_SECTION_ICONS.about}
                iconTone="about"
                title="Acerca de"
                subtitle="Misión, visión e información"
                onClick={() => goToTab('acerca')}
              />
            </div>
          </CompanyProfileSectionCard>

          {showInfoCard ? (
            <CompanyProfileSectionCard title="Información" icon={Building2} iconTone="about">
              <CompanyInfoRows profile={profile} variant="inicio" />
            </CompanyProfileSectionCard>
          ) : null}

          {showSocialCard ? (
            <CompanyProfileSectionCard title="Redes sociales" icon={Share2} iconTone="social">
              <CompanySocialCard
                profile={profile}
                readOnly={readOnly}
                onAddSocial={onEditDetails}
                compact
                embedded
              />
            </CompanyProfileSectionCard>
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
        <CompanyProfileSectionCard title="Ofertas de empleo" icon={Briefcase} iconTone="experience">
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
  } else if (activeTab === 'publicaciones') {
    tabPanel = (
      <div
        className={`${profileContentShellClass} ${profileSectionStackClass}`}
        role="tabpanel"
        aria-label="Publicaciones"
      >
        <CompanyPostsFeed
          posts={posts}
          loading={postsLoading}
          loadingMore={postsLoadingMore}
          hasMore={postsHasMore}
          onLoadMore={loadMorePosts}
          canManage={canManagePosts}
          onEdit={handleEditPost}
          onDelete={handleDeletePost}
          readOnly={readOnly}
          profile={profile}
        />
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
        <CompanyProfileSectionCard title="Servicios" icon={Wrench} iconTone="service">
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
