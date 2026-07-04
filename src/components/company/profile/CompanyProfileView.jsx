import { useState } from 'react';
import CompanyProfileHeader, { CompanyAboutSection } from './CompanyProfileHeader';
import CompanyServicesSection from './CompanyServicesSection';
import CompanyContactSection from './CompanyContactSection';
import CompanyJobsSection from './CompanyJobsSection';
import CompanyActivitySection from './CompanyActivitySection';
import CompanyFollowersSection from './CompanyFollowersSection';
import CompanySocialCard from './CompanySocialCard';
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
  onEditDetails,
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
        onEditDetails={onEditDetails}
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
      <div className="border-b border-gray-200 bg-white px-4 py-5">
        <CompanySocialCard
          profile={profile}
          readOnly={readOnly}
          onAddSocial={onEditDetails}
        />
      </div>
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
