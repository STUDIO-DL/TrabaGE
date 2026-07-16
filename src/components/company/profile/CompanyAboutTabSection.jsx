import Card from '../../ui/Card';
import CompanyAboutSection from './CompanyAboutSection';
import CompanyInfoRows from './CompanyInfoRows';
import CompanySocialCard from './CompanySocialCard';
import CompanyContactSection from './CompanyContactSection';
import Button from '../../ui/Button';

export default function CompanyAboutTabSection({
  profile,
  readOnly = false,
  onEditAbout,
  onEditDetails,
  onSaveContact,
  contactSaving = false,
}) {
  return (
    <div className="space-y-space-base px-space-base py-space-base">
      <Card padding="md">
        <CompanyAboutSection
          profile={profile}
          readOnly={readOnly}
          onEditAbout={onEditAbout}
          expanded
          compact={false}
          embedded
        />
      </Card>

      <Card padding="md">
        <h3 className="mb-space-sm text-body font-semibold text-app-text">Información</h3>
        <CompanyInfoRows profile={profile} variant="full" />
        {!readOnly && onEditDetails && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-space-sm"
            onClick={onEditDetails}
          >
            Editar información
          </Button>
        )}
      </Card>

      <CompanySocialCard profile={profile} readOnly={readOnly} onAddSocial={onEditDetails} />

      {!readOnly && (
        <CompanyContactSection
          profile={profile}
          readOnly={false}
          onSave={onSaveContact}
          saving={contactSaving}
        />
      )}

      {readOnly && (
        <CompanyContactSection profile={profile} readOnly />
      )}
    </div>
  );
}
