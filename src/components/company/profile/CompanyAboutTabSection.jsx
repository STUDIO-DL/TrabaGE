import CompanyAboutSection from './CompanyAboutSection';
import CompanyInfoRows, { hasVisibleCompanyInfoRows } from './CompanyInfoRows';
import CompanySocialCard, { hasCompanySocialLinks } from './CompanySocialCard';
import CompanyContactSection from './CompanyContactSection';
import CompanyProfileSectionCard from './CompanyProfileSectionCard';
import { profileContentShellClass, sectionLinkClass } from './companyProfileStyles';

export default function CompanyAboutTabSection({
  profile,
  readOnly = false,
  onEditAbout,
  onEditDetails,
  onSaveContact,
  contactSaving = false,
}) {
  const showInfoCard = hasVisibleCompanyInfoRows(profile, 'full');
  const showSocialCard = hasCompanySocialLinks(profile) || !readOnly;

  return (
    <div className={`${profileContentShellClass} space-y-space-base px-space-base py-space-base`}>
      <CompanyProfileSectionCard
        title="Acerca de"
        action={
          !readOnly && onEditAbout ? (
            <button type="button" onClick={onEditAbout} className={sectionLinkClass}>
              Editar
            </button>
          ) : null
        }
      >
        <CompanyAboutSection
          profile={profile}
          readOnly={readOnly}
          onEditAbout={onEditAbout}
          expanded
          compact={false}
          embedded
        />
      </CompanyProfileSectionCard>

      {showInfoCard && (
        <CompanyProfileSectionCard
          title="Información"
          action={
            !readOnly && onEditDetails ? (
              <button type="button" onClick={onEditDetails} className={sectionLinkClass}>
                Editar
              </button>
            ) : null
          }
        >
          <CompanyInfoRows profile={profile} variant="full" />
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

      {!readOnly ? (
        <CompanyContactSection
          profile={profile}
          readOnly={false}
          onSave={onSaveContact}
          saving={contactSaving}
        />
      ) : (
        <CompanyContactSection profile={profile} readOnly />
      )}
    </div>
  );
}
