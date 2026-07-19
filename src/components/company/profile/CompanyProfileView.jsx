import { useMemo, useState } from 'react';
import CompanyProfileHeader from './CompanyProfileHeader';
import CompanyProfileTabs from './CompanyProfileTabs';
import CompanyProfileCompleteness from './CompanyProfileCompleteness';
import CompanyAboutSection from './CompanyAboutSection';
import CompanyAboutTabSection from './CompanyAboutTabSection';
import CompanyServicesSection from './CompanyServicesSection';
import CompanyJobsSection from './CompanyJobsSection';
import CompanyPostsSection, { CompanyPostsFeed } from './CompanyPostsSection';
import CompanyInfoRows, { hasVisibleCompanyInfoRows } from './CompanyInfoRows';
import CompanySocialCard, { hasCompanySocialLinks } from './CompanySocialCard';
import CompanyProfileSectionCard from './CompanyProfileSectionCard';
import ProjectsSection from '../../profile/ProjectsSection';
import { usePosts } from '../../../hooks/usePosts';
import { sectionLinkClass, profileContentShellClass, profileInicioGridClass } from './companyProfileStyles';
import { hasCompanyDescription } from '../../../utils/companyProfile';

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
  onSaveContact,
  contactSaving = false,
  logoLoading = false,
  coverLoading = false,
  showFollowButton = false,
  showBackButton = false,
  isFollowing = false,
  followLoading = false,
  canFollow = true,
  onToggleFollow,
  onContact,
  contactDisabled = false,
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
  const showPublicActions = readOnly && (showFollowButton || onContact || shareUrl);
  const shouldLoadPosts = activeTab === 'inicio' || activeTab === 'publicaciones';

  const {
    posts,
    loading: postsLoading,
    loadingMore: postsLoadingMore,
    hasMore: postsHasMore,
    loadMore: loadMorePosts,
  } = usePosts(companyId, { enabled: shouldLoadPosts });

  const goToTab = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showAboutOnInicio = hasCompanyDescription(profile) || profile?.mission?.trim() || profile?.vision?.trim();
  const infoVariant = 'inicio';
  const showInfoCard = hasVisibleCompanyInfoRows(profile, infoVariant);
  const showSocialCard = hasCompanySocialLinks(profile) || !readOnly;
  const showInicioSidebar = showInfoCard || showSocialCard;
  const inicioGridClass = showInicioSidebar
    ? profileInicioGridClass
    : 'grid gap-space-base';
  const projects = profile?.projects ?? [];
  const showProjectsSection = projects.length > 0 || !readOnly;

  return (
    <div className="bg-app-surface">
      <CompanyProfileHeader
        profile={profile}
        readOnly={readOnly}
        showBackButton={showBackButton}
        onEditName={onEditName}
        onEditIntro={onEditIntro}
        onUploadLogo={onUploadLogo}
        onUploadCover={onUploadCover}
        logoLoading={logoLoading}
        coverLoading={coverLoading}
        followerCount={followerCount}
        showFollowerCount={showFollowerCount}
        showActions={showPublicActions}
        showFollow={showFollowButton}
        isFollowing={isFollowing}
        followLoading={followLoading}
        canFollow={canFollow}
        onToggleFollow={onToggleFollow}
        onViewJobs={() => goToTab('empleos')}
        hasJobs={activeJobCount > 0}
        shareUrl={shareUrl}
        shareTitle={shareTitle}
        reportTargetId={reportTargetId}
        onContact={onContact}
        contactDisabled={contactDisabled}
        onSettings={onSettings}
      />

      {isOwn && !readOnly && (
        <CompanyProfileCompleteness profile={profile} jobCount={activeJobCount} />
      )}

      <CompanyProfileTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasServices={hasServices}
        stickyTop="top-0"
      />

      {activeTab === 'inicio' && (
        <div className={`${profileContentShellClass} px-space-base py-space-base`}>
          <div className={inicioGridClass}>
            <div className="space-y-space-base">
              {showAboutOnInicio && (
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
              )}

              {showProjectsSection && (
                <ProjectsSection
                  items={projects}
                  isOwn={!readOnly}
                  onAdd={onAddProject}
                  onEdit={onEditProject}
                  onDelete={onDeleteProject}
                />
              )}

              <CompanyProfileSectionCard
                title="Empleos activos"
                action={
                  activeJobCount > 0 ? (
                    <button type="button" onClick={() => goToTab('empleos')} className={sectionLinkClass}>
                      Ver todos
                    </button>
                  ) : null
                }
              >
                <CompanyJobsSection
                  jobs={jobs}
                  readOnly={readOnly}
                  profile={profile}
                  maxVisible={3}
                  onViewAll={() => goToTab('empleos')}
                  variant="preview"
                  showTitle={false}
                  embedded
                />
              </CompanyProfileSectionCard>

              {(posts.length > 0 || postsLoading) && (
                <CompanyProfileSectionCard
                  title="Últimas publicaciones"
                  action={
                    posts.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => goToTab('publicaciones')}
                        className={sectionLinkClass}
                      >
                        Ver todas
                      </button>
                    ) : null
                  }
                >
                  <CompanyPostsSection
                    posts={posts}
                    loading={postsLoading}
                    maxVisible={3}
                    onViewAll={() => goToTab('publicaciones')}
                    embedded
                  />
                </CompanyProfileSectionCard>
              )}
            </div>

            {showInicioSidebar && (
              <aside className="space-y-space-base">
                {showInfoCard && (
                  <CompanyProfileSectionCard title="Información">
                    <CompanyInfoRows profile={profile} variant={infoVariant} />
                  </CompanyProfileSectionCard>
                )}

                {showSocialCard && (
                  <CompanyProfileSectionCard title="Redes sociales">
                    <CompanySocialCard
                      profile={profile}
                      readOnly={readOnly}
                      onAddSocial={onEditDetails}
                      compact
                      embedded
                    />
                  </CompanyProfileSectionCard>
                )}
              </aside>
            )}
          </div>
        </div>
      )}

      {activeTab === 'empleos' && (
        <div className={profileContentShellClass}>
          <CompanyJobsSection jobs={jobs} readOnly={readOnly} profile={profile} variant="full" showTitle={false} />
        </div>
      )}

      {activeTab === 'publicaciones' && (
        <div className={profileContentShellClass}>
          <CompanyPostsFeed
            posts={posts}
            loading={postsLoading}
            loadingMore={postsLoadingMore}
            hasMore={postsHasMore}
            onLoadMore={loadMorePosts}
            readOnly={readOnly}
            profile={profile}
          />
        </div>
      )}

      {activeTab === 'acerca' && (
        <CompanyAboutTabSection
          profile={profile}
          readOnly={readOnly}
          onEditAbout={onEditAbout}
          onEditDetails={onEditDetails}
          onSaveContact={onSaveContact}
          contactSaving={contactSaving}
        />
      )}

      {activeTab === 'servicios' && hasServices && (
        <div className={profileContentShellClass}>
          <CompanyServicesSection
            items={services}
            readOnly={readOnly}
            onAdd={onAddService}
            onDelete={onDeleteService}
          />
        </div>
      )}
    </div>
  );
}
