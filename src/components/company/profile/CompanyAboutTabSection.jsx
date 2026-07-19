import { Building2, Share2, PROFILE_SECTION_ICONS } from '../../../constants/icons';
import CompanyAboutSection from './CompanyAboutSection';
import CompanyInfoRows, { hasVisibleCompanyInfoRows } from './CompanyInfoRows';
import CompanySocialCard, { hasCompanySocialLinks } from './CompanySocialCard';
import CompanyContactSection from './CompanyContactSection';
import CompanyProfileSectionCard from './CompanyProfileSectionCard';
import { profileContentShellClass, profileSectionStackClass, sectionLinkClass } from './companyProfileStyles';

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
  const showContactCard = !readOnly || hasCompanyActionableContact(profile);

  return (
    <div className={`${profileContentShellClass} ${profileSectionStackClass}`}>
      <CompanyProfileSectionCard
        title="Acerca de"
        icon={PROFILE_SECTION_ICONS.about}
        iconTone="about"
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
          icon={Building2}
          iconTone="about"
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

      {showContactCard ? (
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
  );
}
