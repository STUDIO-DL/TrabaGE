import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import FormPageLayout from '../../components/layout/FormPageLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { FormPageSkeleton } from '../../components/common/Skeleton';
import { ACCOUNT_KINDS } from '../../constants/accountKinds';
import { ROLE_PROFILE, ROLES } from '../../constants/roles';
import {
  ORGANIZATION_TYPE_OPTIONS,
  organizationTypeToCompanyType,
} from '../../constants/registerAccountConfig';
import { useAuth } from '../../hooks/useAuth';
import { consumePendingOrgDetails, consumePendingOrgKind } from '../../services/auth.service';
import { companyService } from '../../services/company.service';
import { readIdentityFromUser } from '../../utils/displayIdentity';
import { getOrgLabels } from '../../utils/orgLabels';
import { getCompanyBootstrapMissing } from '../../utils/profileRequirements';
import { getOwnCompanyProfileKey } from '../../constants/profileQueryKeys';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

function getDefaultCompanyType(orgKind) {
  if (orgKind === ACCOUNT_KINDS.ORGANIZATION) return 'Institucion publica';
  return '';
}

/**
 * Setup assistant for business/organization — only shown when bootstrap identity
 * (company_name, and company_type for orgs) is missing. Description, sector, and
 * city are enriched on the profile page instead of repeating registration data.
 */
export default function CompanySetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, role, refreshSetupStatus } = useAuth();
  const [form, setForm] = useState({
    company_name: '',
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

    companyService.getCompanyProfile(user.id).then(({ data, error: profileError }) => {
      if (!mounted) return;

      if (profileError) {
        setError(getSupabaseErrorMessage(profileError));
        setInitializing(false);
        return;
      }

      const resolvedRole =
        role === ROLES.ORGANIZATION ? ROLES.ORGANIZATION : ROLES.BUSINESS;

      if (getCompanyBootstrapMissing(data, resolvedRole).length === 0) {
        void refreshSetupStatus().finally(() => {
          navigate(ROLE_PROFILE[resolvedRole], { replace: true });
        });
        return;
      }

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
        company_type: companyType,
        organizationType,
      });
      setInitializing(false);
    });

    return () => {
      mounted = false;
    };
  }, [user, role, navigate, refreshSetupStatus]);

  const orgLabels = getOrgLabels({ company_type: form.company_type });
  const isOrganizationAccount = role === ROLES.ORGANIZATION;

  const missingFields = useMemo(
    () => getCompanyBootstrapMissing({ ...form, company_type: form.company_type }, role),
    [form, role],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = {
      company_name: form.company_name.trim(),
      company_type: form.company_type,
    };

    if (getCompanyBootstrapMissing(trimmed, role).length > 0) {
      setError(
        isOrganizationAccount
          ? 'Completa los campos obligatorios de tu institución.'
          : 'Completa los campos obligatorios de tu cuenta Business.',
      );
      return;
    }

    setLoading(true);

    const { error: saveError } = await companyService.upsertCompanyProfile({
      user_id: user.id,
      ...trimmed,
    });

    if (saveError) {
      setError(getSupabaseErrorMessage(saveError));
      setLoading(false);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: getOwnCompanyProfileKey(user.id) });
    await refreshSetupStatus();
    const homeRole = role === ROLES.ORGANIZATION ? ROLES.ORGANIZATION : ROLES.BUSINESS;
    navigate(ROLE_PROFILE[homeRole], { replace: true });
  };

  if (initializing) {
    return (
      <FormPageLayout title={`Configura tu ${orgLabels.entity}`}>
        <FormPageSkeleton fields={3} />
      </FormPageLayout>
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
      </form>
    </FormPageLayout>
  );
}
