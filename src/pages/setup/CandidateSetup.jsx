import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormPageLayout from '../../components/layout/FormPageLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import { CITIES } from '../../constants/cities';
import { useAuth } from '../../hooks/useAuth';
import { profileService } from '../../services/profile.service';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

export default function CandidateSetup() {
  const navigate = useNavigate();
  const { user, refreshSetupStatus } = useAuth();
  const [form, setForm] = useState({ full_name: '', headline: '', about: '', city: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: saveError } = await profileService.upsertCandidateProfile({
      user_id: user.id,
      ...form,
      setup_complete: true,
    });

    if (saveError) {
      setError(getSupabaseErrorMessage(saveError));
      setLoading(false);
      return;
    }

    await refreshSetupStatus();
    navigate('/candidate/feed', { replace: true });
  };

  return (
    <FormPageLayout
      title="Completa tu perfil"
      footer={
        <>
          {error ? <p className="mb-sm text-small text-red-600">{error}</p> : null}
          <Button type="submit" form="candidate-setup-form" fullWidth loading={loading} className="btn-primary-mobile !rounded-btn-primary !py-0">
            Continuar
          </Button>
        </>
      }
    >
      <form id="candidate-setup-form" onSubmit={handleSubmit} className="space-y-md p-md">
        <Input label="Nombre completo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        <Input label="Titular profesional" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
        <Textarea label="Sobre mí" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
        <Select label="Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} options={[{ value: '', label: 'Seleccionar' }, ...CITIES.map((c) => ({ value: c, label: c }))]} />
      </form>
    </FormPageLayout>
  );
}
