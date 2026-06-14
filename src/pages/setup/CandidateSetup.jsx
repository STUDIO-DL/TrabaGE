import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import { CITIES } from '../../constants/cities';
import { useAuth } from '../../hooks/useAuth';
import { profileService } from '../../services/profile.service';

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
      setError(saveError.message);
      setLoading(false);
      return;
    }

    await refreshSetupStatus();
    navigate('/candidate/feed', { replace: true });
  };

  return (
    <PageContainer title="Completa tu perfil" bottomNav={false}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <Input label="Nombre completo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        <Input label="Titular profesional" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
        <Textarea label="Sobre mí" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
        <Select label="Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} options={[{ value: '', label: 'Seleccionar' }, ...CITIES.map((c) => ({ value: c, label: c }))]} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth loading={loading}>
          Continuar
        </Button>
      </form>
    </PageContainer>
  );
}
