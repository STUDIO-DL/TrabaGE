import { useEffect, useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Badge from '../../components/ui/Badge';
import FileUpload from '../../components/ui/FileUpload';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { companyService } from '../../services/company.service';

export default function Verification() {
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    companyService.getVerificationStatus(user.id).then(({ data }) => {
      setRequest(data);
      setLoading(false);
    });
  }, [user?.id]);

  const handleUpload = async (file, error) => {
    if (error || !file) return;
    await companyService.submitVerification({
      company_id: user.id,
      document_url: `${user.id}/document.pdf`,
    });
    const { data } = await companyService.getVerificationStatus(user.id);
    setRequest(data);
  };

  return (
    <PageContainer title="Verificación" backButton bottomNav={false}>
      <div className="space-y-4 p-4">
        {loading ? (
          <Spinner fullscreen />
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Sube un documento legal para verificar tu empresa y mostrar el distintivo de confianza.
            </p>
            {request ? (
              <Badge variant={request.status === 'verified' ? 'verified' : 'pending'} label={request.status} />
            ) : (
              <FileUpload label="Subir documento (PDF)" accept="application/pdf" onUpload={handleUpload} />
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
