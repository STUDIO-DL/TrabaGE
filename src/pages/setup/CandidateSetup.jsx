import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormPageLayout from '../../components/layout/FormPageLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import { CITIES } from '../../constants/cities';
import { ROLE_HOME, ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { profileService } from '../../services/profile.service';
import { extractGoogleProfile } from '../../utils/googleProfile';
import { getCandidateRequiredMissing } from '../../utils/profileRequirements';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

export default function CandidateSetup() {
  const navigate = useNavigate();
  const { user, refreshSetupStatus } = useAuth();
  const [form, setForm] = useState({ full_name: '', headline: '', about: '', city: '' });
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return undefined;
    let mounted = true;

    const google = extractGoogleProfile(user);
    profileService.getCandidateProfile(user.id).then(({ data }) => {
      if (!mounted) return;
      setForm({
        full_name: data?.full_name || google.full_name || '',
        headline: data?.headline || '',
        about: data?.about || '',
        city: data?.city || '',
      });
      setInitializing(false);
    });

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = {
      full_name: form.full_name.trim(),
      headline: form.headline.trim(),
      about: form.about.trim(),
      city: form.city.trim(),
    };

    if (getCandidateRequiredMissing(trimmed).length > 0) {
      setError('Completa tu nombre, tu profesión y tu ciudad para continuar.');
      return;
    }

    setLoading(true);

    const { error: saveError } = await profileService.upsertCandidateProfile({
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
    navigate(ROLE_HOME[ROLES.PERSONAL], { replace: true });
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
      title="Completa tu perfil"
      footer={
        <>
          {error ? <p className="mb-space-sm text-body-small text-error-600">{error}</p> : null}
          <Button type="submit" form="candidate-setup-form" fullWidth loading={loading} size="lg">
            Continuar
          </Button>
        </>
      }
    >
      <form id="candidate-setup-form" onSubmit={handleSubmit} className="space-y-space-base p-space-base">
        <Input label="Nombre completo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        <Input label="Titular profesional" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Ej. Desarrollador Frontend" required />
        <Textarea label="Sobre mí" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
        <Select label="Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required options={[{ value: '', label: 'Seleccionar' }, ...CITIES.map((c) => ({ value: c, label: c }))]} />
      </form>
    </FormPageLayout>
  );
}
