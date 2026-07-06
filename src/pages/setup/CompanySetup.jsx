import { useEffect, useState } from 'react';
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
import { useAuth } from '../../hooks/useAuth';
import { consumePendingOrgDetails, consumePendingOrgKind } from '../../services/auth.service';
import { companyService } from '../../services/company.service';
import { getOrgLabels } from '../../utils/orgLabels';
import { getCompanyRequiredMissing } from '../../utils/profileRequirements';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

function getDefaultCompanyType(orgKind) {
  if (orgKind === ACCOUNT_KINDS.INSTITUTION) return 'Institucion publica';
  return '';
}

export default function CompanySetup() {
  const navigate = useNavigate();
  const { user, refreshSetupStatus } = useAuth();
  const [form, setForm] = useState({
    company_name: '',
    sector: '',
    description: '',
    city: '',
    company_type: '',
  });
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return undefined;
    let mounted = true;

    // Pending values are a fallback for prefill; the bootstrap step usually
    // already wrote them into the profile row, so the existing profile wins.
    const pendingOrgKind = consumePendingOrgKind();
    const pendingOrgDetails = consumePendingOrgDetails();

    companyService.getCompanyProfile(user.id).then(({ data }) => {
      if (!mounted) return;
      setForm({
        company_name: data?.company_name || pendingOrgDetails.company_name || '',
        sector: data?.sector || pendingOrgDetails.sector || '',
        description: data?.description || '',
        city: data?.city || '',
        company_type:
          data?.company_type || pendingOrgDetails.company_type || getDefaultCompanyType(pendingOrgKind),
      });
      setInitializing(false);
    });

    return () => {
      mounted = false;
    };
  }, [user]);

  const orgLabels = getOrgLabels({ company_type: form.company_type });
  const isInstitution = orgLabels.entity === 'institución';

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
          ? 'Completa el nombre, la ciudad y la descripción de tu institución.'
          : 'Completa el nombre, el sector, la ciudad y la descripción de tu empresa.',
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
    navigate(ROLE_HOME[ROLES.COMPANY], { replace: true });
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
          {error ? <p className="mb-sm text-small text-red-600">{error}</p> : null}
          <Button type="submit" form="company-setup-form" fullWidth loading={loading} className="btn-primary-mobile !rounded-btn-primary !py-0">
            Continuar
          </Button>
        </>
      }
    >
      <form id="company-setup-form" onSubmit={handleSubmit} className="space-y-md p-md">
        <Input
          label={`Nombre de la ${orgLabels.entity}`}
          value={form.company_name}
          onChange={(e) => setForm({ ...form, company_name: e.target.value })}
          required
        />
        <Select label="Sector" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} required={!isInstitution} options={[{ value: '', label: 'Seleccionar' }, ...SECTORS.map((s) => ({ value: s, label: s }))]} />
        <Textarea label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <Select label="Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required options={[{ value: '', label: 'Seleccionar' }, ...CITIES.map((c) => ({ value: c, label: c }))]} />
      </form>
    </FormPageLayout>
  );
}
