import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import FileUpload from '../../components/ui/FileUpload';
import { useAuth } from '../../hooks/useAuth';
import { applicationsService } from '../../services/applications.service';

export default function ApplyJob() {
  const { id: jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: applyError } = await applicationsService.apply({
      candidate_id: user.id,
      job_id: jobId,
      cv_url: `${user.id}/applications/${jobId}-cv.pdf`,
      cv_name: 'cv.pdf',
      full_name: fullName,
      additional_notes: notes || null,
    });

    if (applyError) {
      setError(applyError.message);
      setLoading(false);
      return;
    }

    navigate('/candidate/applications', { replace: true });
  };

  return (
    <PageContainer title="Aplicar al empleo" backButton bottomNav={false}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <Input label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <FileUpload label="Subir CV (PDF)" accept="application/pdf" fileType="document" maxSize="2 MB" />
        <Textarea label="Notas adicionales (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth loading={loading}>
          Enviar aplicación
        </Button>
      </form>
    </PageContainer>
  );
}
