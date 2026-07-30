import CompanyAboutSection from './CompanyAboutSection';
import CompanyInfoRows, { hasVisibleCompanyInfoRows } from './CompanyInfoRows';
import CompanySocialCard, { hasCompanySocialLinks } from './CompanySocialCard';
import CompanyProfileSectionCard from './CompanyProfileSectionCard';
import { profileContentShellClass, profileSectionStackClass, sectionLinkClass } from './companyProfileStyles';

export default function CompanyAboutTabSection({
  profile,
  readOnly = false,
  onEditAbout,
  onEditDetails,
  companyId = null,
}) {
  const showInfoCard = hasVisibleCompanyInfoRows(profile, 'full');
  const showSocialCard = hasCompanySocialLinks(profile) || !readOnly;

  return (
    <div className={`${profileContentShellClass} ${profileSectionStackClass}`}>
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

      {showInfoCard ? (
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
          <CompanyInfoRows
            profile={profile}
            variant="full"
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
    </div>
  );
}
