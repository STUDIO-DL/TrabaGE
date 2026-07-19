import { useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  Newspaper,
  Share2,
  Wrench,
  PROFILE_SECTION_ICONS,
} from '../../../constants/icons';
import CompanyProfileHeader from './CompanyProfileHeader';
import CompanyProfileTabs from './CompanyProfileTabs';
import CompanyProfileCompleteness from './CompanyProfileCompleteness';
import CompanyProfileActionBar from './CompanyProfileActionBar';
import CompanyAboutSection from './CompanyAboutSection';
import CompanyAboutTabSection from './CompanyAboutTabSection';
import CompanyServicesSection from './CompanyServicesSection';
import CompanyJobsSection from './CompanyJobsSection';
import CompanyPostsSection, { CompanyPostsFeed } from './CompanyPostsSection';
import CompanyInfoRows, { hasVisibleCompanyInfoRows } from './CompanyInfoRows';
import CompanySocialCard, { hasCompanySocialLinks } from './CompanySocialCard';
import CompanyContactSection from './CompanyContactSection';
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
import { hasCompanyActionableContact } from '../../../utils/contact';

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
  logoPhase = null,
  coverLoading = false,
  coverPhase = null,
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
  const infoVariant = 'inicio';
  const showInfoCard = hasVisibleCompanyInfoRows(profile, infoVariant);
  const showSocialCard = hasCompanySocialLinks(profile) || !readOnly;
  const projects = profile?.projects ?? [];
  const showProjectsSection = projects.length > 0 || !readOnly;

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
      />

      {showPublicActions ? (
        <CompanyProfileActionBar
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
        />
      ) : null}

      {isOwn && !readOnly ? (
        <CompanyProfileCompleteness profile={profile} jobCount={activeJobCount} />
      ) : null}

      <CompanyProfileTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasServices={hasServices || !readOnly}
      />

      {activeTab === 'inicio' && (
        <div className={`${profileContentShellClass} ${profileSectionStackClass}`}>
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

            <CompanyProfileSectionCard
              title="Ofertas de empleo"
              icon={Briefcase}
              iconTone="experience"
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

            <CompanyProfileSectionCard
              title="Publicaciones"
              icon={Newspaper}
              iconTone="document"
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
                canManage={canManagePosts}
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
                embedded
                readOnly={readOnly}
                profile={profile}
              />
            </CompanyProfileSectionCard>

            {showInfoCard ? (
              <CompanyProfileSectionCard title="Información" icon={Building2} iconTone="about">
                <CompanyInfoRows profile={profile} variant={infoVariant} />
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

            {(!readOnly || hasCompanyActionableContact(profile)) ? (
              <CompanyProfileSectionCard
                title="Contacto"
                icon={PROFILE_SECTION_ICONS.contact}
                iconTone="contact"
              >
                <CompanyContactSection
                  profile={profile}
                  readOnly={readOnly}
                  onSave={onSaveContact}
                  saving={contactSaving}
                  embedded
                />
              </CompanyProfileSectionCard>
            ) : null}
          </div>
        </div>
      )}

      {activeTab === 'empleos' && (
        <div className={profileContentShellClass}>
          <CompanyProfileSectionCard
            title="Ofertas de empleo"
            icon={Briefcase}
            iconTone="experience"
            className="mx-space-base my-space-base"
          >
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
      )}

      {activeTab === 'publicaciones' && (
        <div className={profileContentShellClass}>
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

      {activeTab === 'servicios' && (hasServices || !readOnly) ? (
        <div className={`${profileContentShellClass} ${profileSectionStackClass}`}>
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
      ) : null}
    </div>
  );
}
