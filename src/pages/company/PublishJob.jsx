import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import { CITIES } from '../../constants/cities';
import { JOB_TYPES } from '../../constants/jobTypes';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { jobsService } from '../../services/jobs.service';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';

export default function PublishJob() {
  const navigate = useNavigate();
  const { user, isPreviewMode } = useAuth();
  const { showToast } = useNotificationContext();
  const [form, setForm] = useState({
    title: '',
    description: '',
    requirements: '',
    salary: '',
    city: '',
    job_type: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      return;
    }

    setLoading(true);
    setError('');

    const { error: saveError } = await jobsService.createJob({
      company_id: user.id,
      ...form,
      status: 'active',
    });

    if (saveError) {
      setError(saveError.message);
      setLoading(false);
      return;
    }

    navigate('/company/dashboard', { replace: true });
  };

  return (
    <PageContainer title="Publicar empleo" backButton>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <Input label="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <Textarea label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Textarea label="Requisitos" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
        <Input label="Salario" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
        <Select label="Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} options={[{ value: '', label: 'Seleccionar' }, ...CITIES.map((c) => ({ value: c, label: c }))]} />
        <Select label="Tipo de empleo" value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value })} options={[{ value: '', label: 'Seleccionar' }, ...JOB_TYPES]} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth loading={loading}>
          Publicar
        </Button>
      </form>
    </PageContainer>
  );
}
