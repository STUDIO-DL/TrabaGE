import { useMemo, useState } from 'react';
import Card from '../../ui/Card';
import CompanyProfileHeader from './CompanyProfileHeader';
import CompanyProfileTabs from './CompanyProfileTabs';
import CompanyProfileCompleteness from './CompanyProfileCompleteness';
import CompanyAboutSection from './CompanyAboutSection';
import CompanyAboutTabSection from './CompanyAboutTabSection';
import CompanyServicesSection from './CompanyServicesSection';
import CompanyJobsSection from './CompanyJobsSection';
import CompanyPostsSection, { CompanyPostsFeed } from './CompanyPostsSection';
import CompanyInfoRows from './CompanyInfoRows';
import { usePosts } from '../../../hooks/usePosts';

export default function CompanyProfileView({
  profile,
  readOnly = false,
  isOwn = false,
  jobs = [],
  companyId,
  onEditName,
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

  const {
    posts,
    loading: postsLoading,
    loadingMore: postsLoadingMore,
    hasMore: postsHasMore,
    loadMore: loadMorePosts,
  } = usePosts(companyId);

  const goToTab = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-app-surface">
      <CompanyProfileHeader
        profile={profile}
        readOnly={readOnly}
        onEditName={onEditName}
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
      />

      {isOwn && !readOnly && (
        <CompanyProfileCompleteness profile={profile} jobCount={activeJobCount} />
      )}

      <CompanyProfileTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasServices={hasServices || !readOnly}
      />

      {activeTab === 'inicio' && (
        <div className="divide-y divide-app-border">
          <Card padding="none" className="border-0 shadow-none">
            <CompanyAboutSection
              profile={profile}
              readOnly={readOnly}
              onEditAbout={onEditAbout}
              expanded={aboutExpanded}
              onToggleExpand={() => setAboutExpanded((value) => !value)}
              onViewMore={() => goToTab('acerca')}
              compact
            />
          </Card>

          <CompanyJobsSection
            jobs={jobs}
            readOnly={readOnly}
            maxVisible={3}
            onViewAll={() => goToTab('empleos')}
            variant="preview"
          />

          <CompanyPostsSection
            posts={posts}
            loading={postsLoading}
            maxVisible={2}
            onViewAll={() => goToTab('publicaciones')}
          />

          <section className="px-space-base py-space-base">
            <h3 className="text-body font-semibold text-app-text">Información</h3>
            <div className="mt-space-sm">
              <CompanyInfoRows profile={profile} variant="minimal" />
            </div>
          </section>
        </div>
      )}

      {activeTab === 'empleos' && (
        <CompanyJobsSection jobs={jobs} readOnly={readOnly} variant="full" showTitle={false} />
      )}

      {activeTab === 'publicaciones' && (
        <CompanyPostsFeed
          posts={posts}
          loading={postsLoading}
          loadingMore={postsLoadingMore}
          hasMore={postsHasMore}
          onLoadMore={loadMorePosts}
        />
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

      {activeTab === 'servicios' && (hasServices || !readOnly) && (
        <CompanyServicesSection
          items={services}
          readOnly={readOnly}
          onAdd={onAddService}
          onDelete={onDeleteService}
        />
      )}
    </div>
  );
}
