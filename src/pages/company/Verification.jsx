import { useEffect, useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import FileUpload from '../../components/ui/FileUpload';
import AppIcon from '../../components/common/AppIcon';
import Spinner from '../../components/ui/Spinner';
import VerifiedBadge from '../../components/company/VerifiedBadge';
import { ShieldCheck, ICON_SIZES } from '../../constants/icons';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { verificationService } from '../../services/verification.service';
import { storageService } from '../../services/storage.service';
import { verificationDocPath } from '../../constants/storage';
import {
  getVerificationStatus,
  isCompanyVerified,
  validateVerificationFile,
  VERIFICATION_ACCEPT,
} from '../../utils/companyVerification';
import { FILE_HINTS } from '../../utils/validateFile';
import { formatRelativeTime } from '../../utils/formatDate';
import { PREVIEW_COMPANY_PROFILE, PREVIEW_COMPANY_VERIFICATION } from '../../constants/preview';

export default function Verification() {
  const { user, isPreviewMode } = useAuth();
  const { showToast } = useNotificationContext();
  const [companyProfile, setCompanyProfile] = useState(null);
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    if (!user?.id) return;

    if (isPreviewMode) {
      setCompanyProfile(PREVIEW_COMPANY_PROFILE);
      setRequest(PREVIEW_COMPANY_VERIFICATION);
      setLoading(false);
      return;
    }

    const [{ data: profile }, { data: latestRequest }] = await Promise.all([
      verificationService.getCompanyVerificationProfile(user.id),
      verificationService.getLatestRequest(user.id),
    ]);

    setCompanyProfile(profile);
    setRequest(latestRequest);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.id, isPreviewMode]);

  const verificationStatus = getVerificationStatus(companyProfile);
  const verified = isCompanyVerified(companyProfile);

  const handleUpload = async (file, uploadError) => {
    if (uploadError || !file) {
      if (uploadError) showToast(uploadError, 'error');
      return;
    }

    const validation = validateVerificationFile(file);
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }

    if (isPreviewMode) {
      showToast('Modo vista previa: el documento no se enviará', 'info');
      return;
    }

    if (verificationStatus === 'pending') {
      showToast('Ya tienes una solicitud en revisión.', 'info');
      return;
    }

    setUploading(true);

    const { data: uploadData, error: storageError } = await storageService.uploadVerificationDoc(
      user.id,
      file,
      request?.verification_document_path,
    );

    if (storageError) {
      setUploading(false);
      showToast(storageError.message, 'error');
      return;
    }

    const documentPath = uploadData?.path ?? verificationDocPath(user.id);
    const { error } = await verificationService.submitRequest(documentPath, file.name);

    setUploading(false);

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    showToast('Solicitud enviada correctamente', 'success');
    await loadData();
  };

  const renderContent = () => {
    if (verified) {
      return (
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center gap-3">
            <VerifiedBadge size="md" />
            <div>
              <p className="font-semibold text-gray-900">Empresa Verificada</p>
              {companyProfile?.verified_at && (
                <p className="text-sm text-gray-500">
                  Aprobada el {new Date(companyProfile.verified_at).toLocaleDateString('es-ES')}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Tu distintivo de verificación aparece automáticamente en tu perfil, empleos y publicaciones.
          </p>
        </Card>
      );
    }

    if (verificationStatus === 'pending') {
      return (
        <Card padding="lg" className="space-y-3">
          <Badge variant="pending" label="En revisión" />
          <p className="text-sm text-gray-700">Tu solicitud está siendo revisada.</p>
          {request?.document_name && (
            <p className="text-xs text-gray-500">Documento: {request.document_name}</p>
          )}
          {request?.created_at && (
            <p className="text-xs text-gray-400">
              Enviada {formatRelativeTime(request.created_at)}
            </p>
          )}
        </Card>
      );
    }

    if (verificationStatus === 'rejected') {
      return (
        <Card padding="lg" className="space-y-4">
          <Badge variant="error" label="Rechazada" />
          <p className="text-sm text-gray-700">Tu solicitud fue rechazada.</p>
          {request?.review_notes && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {request.review_notes}
            </div>
          )}
          <FileUpload
            label="Enviar Nueva Solicitud"
            accept={VERIFICATION_ACCEPT}
            fileType="verification"
            loading={uploading}
            maxSize={FILE_HINTS.verification}
            onUpload={handleUpload}
          />
        </Card>
      );
    }

    return (
      <Card padding="lg" className="space-y-4">
        <p className="text-sm text-gray-600">
          Sube un documento legal ({FILE_HINTS.verification}) para verificar tu empresa.
        </p>
        <FileUpload
          label="Subir Documento"
          accept={VERIFICATION_ACCEPT}
          fileType="verification"
          loading={uploading}
          maxSize="10 MB"
          onUpload={handleUpload}
        />
      </Card>
    );
  };

  return (
    <PageContainer title="Verificación de Empresa" backButton bottomNav={false}>
      <div className="space-y-4 p-4">
        {loading ? (
          <Spinner fullscreen />
        ) : (
          <>
            <div className="flex items-start gap-3">
              <AppIcon icon={ShieldCheck} size={ICON_SIZES.lg} className="text-primary-600" />
              <div>
                <h2 className="font-semibold text-gray-900">Verificación de Empresa</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Obtén el distintivo de empresa verificada y genera confianza en candidatos.
                </p>
              </div>
            </div>
            {renderContent()}
          </>
        )}
      </div>
    </PageContainer>
  );
}
