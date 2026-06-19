import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormPageLayout from '../../components/layout/FormPageLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import { CITIES } from '../../constants/cities';
import { SECTORS } from '../../constants/sectors';
import { useAuth } from '../../hooks/useAuth';
import { companyService } from '../../services/company.service';

export default function CompanySetup() {
  const navigate = useNavigate();
  const { user, refreshSetupStatus } = useAuth();
  const [form, setForm] = useState({ company_name: '', sector: '', description: '', city: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: saveError } = await companyService.upsertCompanyProfile({
      user_id: user.id,
      ...form,
      setup_complete: true,
    });

    if (saveError) {
      setError(saveError.message);
      setLoading(false);
      return;
    }

    await refreshSetupStatus();
    navigate('/company/feed', { replace: true });
  };

  return (
    <FormPageLayout
      title="Configura tu empresa / institución"
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
        <Input label="Nombre de la empresa / institución" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
        <Select label="Sector" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} options={[{ value: '', label: 'Seleccionar' }, ...SECTORS.map((s) => ({ value: s, label: s }))]} />
        <Textarea label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Select label="Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} options={[{ value: '', label: 'Seleccionar' }, ...CITIES.map((c) => ({ value: c, label: c }))]} />
      </form>
    </FormPageLayout>
  );
}
