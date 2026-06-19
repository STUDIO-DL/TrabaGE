import { useState } from 'react';
import CompanyProfileHeader, { CompanyAboutSection } from './CompanyProfileHeader';
import CompanyServicesSection from './CompanyServicesSection';
import CompanyContactSection from './CompanyContactSection';
import CompanyJobsSection from './CompanyJobsSection';
import CompanyActivitySection from './CompanyActivitySection';
import CompanyFollowersSection from './CompanyFollowersSection';
import { formatFollowerCount } from '../../../utils/formatFollowerCount';
import { FOLLOWS_TARGET } from '../../../services/follows.service';

export default function CompanyProfileView({
  profile,
  readOnly = false,
  jobs = [],
  companyId,
  targetType = FOLLOWS_TARGET.COMPANY,
  onEditName,
  onEditAbout,
  onBookmark,
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
  followerCount = 0,
  showFollowersTab = false,
}) {
  const [aboutExpanded, setAboutExpanded] = useState(false);

  return (
    <div className="bg-gray-50">
      <CompanyProfileHeader
        profile={profile}
        companyId={companyId}
        readOnly={readOnly}
        onEditName={onEditName}
        onBookmark={onBookmark}
        onUploadLogo={onUploadLogo}
        onUploadCover={onUploadCover}
        logoLoading={logoLoading}
        coverLoading={coverLoading}
        showFollowButton={showFollowButton}
        isFollowing={isFollowing}
        followLoading={followLoading}
        canFollow={canFollow}
        onToggleFollow={onToggleFollow}
      />
      <CompanyAboutSection
        profile={profile}
        readOnly={readOnly}
        onEditAbout={onEditAbout}
        expanded={aboutExpanded}
        onToggleExpand={() => setAboutExpanded((value) => !value)}
        followerCountText={formatFollowerCount(followerCount)}
      />
      <CompanyServicesSection
        items={profile?.company_services}
        readOnly={readOnly}
        onAdd={onAddService}
        onDelete={onDeleteService}
      />
      <CompanyContactSection
        profile={profile}
        readOnly={readOnly}
        onSave={onSaveContact}
        saving={contactSaving}
      />
      <CompanyJobsSection jobs={jobs} readOnly={readOnly} />
      <CompanyFollowersSection
        targetType={targetType}
        targetId={companyId}
        visible={showFollowersTab}
      />
      <CompanyActivitySection />
    </div>
  );
}
