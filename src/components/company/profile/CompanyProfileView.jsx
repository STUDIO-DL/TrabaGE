import { useState } from 'react';
import CompanyProfileHeader, { CompanyAboutSection } from './CompanyProfileHeader';
import CompanyServicesSection from './CompanyServicesSection';
import CompanyContactSection from './CompanyContactSection';
import CompanyJobsSection from './CompanyJobsSection';
import CompanyActivitySection from './CompanyActivitySection';

export default function CompanyProfileView({
  profile,
  readOnly = false,
  jobs = [],
  companyId,
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
      />
      <CompanyAboutSection
        profile={profile}
        readOnly={readOnly}
        onEditAbout={onEditAbout}
        expanded={aboutExpanded}
        onToggleExpand={() => setAboutExpanded((value) => !value)}
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
      <CompanyActivitySection />
    </div>
  );
}
