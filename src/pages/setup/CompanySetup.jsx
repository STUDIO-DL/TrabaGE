import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormPageLayout from '../../components/layout/FormPageLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import { CITIES } from '../../constants/cities';
import { ACCOUNT_KINDS } from '../../constants/accountKinds';
import { SECTORS } from '../../constants/sectors';
import { ROLE_HOME, ROLES } from '../../constants/roles';
import {
  ORGANIZATION_TYPE_OPTIONS,
  organizationTypeToCompanyType,
} from '../../constants/registerAccountConfig';
import { useAuth } from '../../hooks/useAuth';
import { consumePendingOrgDetails, consumePendingOrgKind } from '../../services/auth.service';
import { companyService } from '../../services/company.service';
import { readIdentityFromUser } from '../../utils/displayIdentity';
import { getOrgLabels } from '../../utils/orgLabels';
import { getCompanyRequiredMissing } from '../../utils/profileRequirements';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

function getDefaultCompanyType(orgKind) {
  if (orgKind === ACCOUNT_KINDS.ORGANIZATION) return 'Institucion publica';
  return '';
}

export default function CompanySetup() {
  const navigate = useNavigate();
  const { user, role, refreshSetupStatus } = useAuth();
  const [form, setForm] = useState({
    company_name: '',
    sector: '',
    description: '',
    city: '',
    company_type: '',
    organizationType: '',
  });
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return undefined;
    let mounted = true;

    const pendingOrgKind = consumePendingOrgKind();
    const pendingOrgDetails = consumePendingOrgDetails();
    const identity = readIdentityFromUser(user);

    companyService.getCompanyProfile(user.id).then(({ data }) => {
      if (!mounted) return;
      const companyType =
        data?.company_type ||
        pendingOrgDetails.company_type ||
        identity.company_type ||
        getDefaultCompanyType(pendingOrgKind);
      const organizationType =
        ORGANIZATION_TYPE_OPTIONS.find((option) => option.companyType === companyType)?.value || '';

      setForm({
        company_name:
          data?.company_name ||
          pendingOrgDetails.company_name ||
          identity.company_name ||
          '',
        sector: data?.sector || pendingOrgDetails.sector || identity.sector || '',
        description: data?.description || '',
        city: data?.city || identity.city || '',
        company_type: companyType,
        organizationType,
      });
      setInitializing(false);
    });

    return () => {
      mounted = false;
    };
  }, [user]);

  const orgLabels = getOrgLabels({ company_type: form.company_type });
  const isInstitution = orgLabels.entity === 'organización';
  const isOrganizationAccount = role === ROLES.ORGANIZATION;

  const missingFields = useMemo(
    () => getCompanyRequiredMissing({ ...form, company_type: form.company_type }),
    [form],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = {
      company_name: form.company_name.trim(),
      sector: form.sector.trim(),
      description: form.description.trim(),
      city: form.city.trim(),
      company_type: form.company_type,
    };

    if (getCompanyRequiredMissing(trimmed).length > 0) {
      setError(
        isInstitution
          ? 'Completa los campos obligatorios de tu institución.'
          : 'Completa los campos obligatorios de tu cuenta Business.',
      );
      return;
    }

    setLoading(true);

    const { error: saveError } = await companyService.upsertCompanyProfile({
      user_id: user.id,
      ...trimmed,
      setup_complete: true,
    });

    if (saveError) {
      setError(getSupabaseErrorMessage(saveError));
      setLoading(false);
      return;
    }

    await refreshSetupStatus();
    navigate(ROLE_HOME[role] || ROLE_HOME[ROLES.BUSINESS], { replace: true });
  };

  if (initializing) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <FormPageLayout
      title={`Configura tu ${orgLabels.entity}`}
      footer={
        <>
          {error ? <p className="mb-space-sm text-body-small text-error-600">{error}</p> : null}
          <Button type="submit" form="company-setup-form" fullWidth loading={loading} size="lg">
            Continuar
          </Button>
        </>
      }
    >
      <form id="company-setup-form" onSubmit={handleSubmit} className="space-y-space-base p-space-base">
        {!missingFields.includes('company_name') && form.company_name ? (
          <input type="hidden" name="company_name" value={form.company_name} />
        ) : (
          <Input
            label={`Nombre de la ${orgLabels.entity}`}
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            required
          />
        )}
        {isOrganizationAccount && missingFields.includes('company_type') ? (
          <Select
            label="Tipo de organización"
            value={form.organizationType}
            onChange={(e) => {
              const nextType = e.target.value;
              setForm({
                ...form,
                organizationType: nextType,
                company_type: nextType ? organizationTypeToCompanyType(nextType) : form.company_type,
              });
            }}
            required
            options={[
              { value: '', label: 'Seleccionar' },
              ...ORGANIZATION_TYPE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              })),
            ]}
          />
        ) : null}
        {!isInstitution && missingFields.includes('sector') ? (
          <Select
            label="Sector"
            value={form.sector}
            onChange={(e) => setForm({ ...form, sector: e.target.value })}
            required
            options={[{ value: '', label: 'Seleccionar' }, ...SECTORS.map((s) => ({ value: s, label: s }))]}
          />
        ) : null}
        {!missingFields.includes('description') && form.description ? (
          <input type="hidden" name="description" value={form.description} />
        ) : (
          <Textarea
            label="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        )}
        {!missingFields.includes('city') && form.city ? (
          <input type="hidden" name="city" value={form.city} />
        ) : (
          <Select
            label="Ciudad"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            required
            options={[{ value: '', label: 'Seleccionar' }, ...CITIES.map((c) => ({ value: c, label: c }))]}
          />
        )}
      </form>
    </FormPageLayout>
  );
}
