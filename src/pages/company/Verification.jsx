import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import AppIcon from '../../components/common/AppIcon';
import { FormPageSkeleton } from '../../components/common/Skeleton';
import VerifiedBadge from '../../components/company/VerifiedBadge';
import { ShieldCheck, Upload, ICON_SIZES } from '../../constants/icons';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { verificationService } from '../../services/verification.service';
import { storageService } from '../../services/storage.service';
import {
  getVerificationStatus,
  isCompanyVerified,
  validateVerificationFile,
  VERIFICATION_ACCEPT,
  REPRESENTATIVE_DOC_ACCEPT,
  COMPANY_DOCUMENT_TYPES,
  REPRESENTATIVE_DOCUMENT_TYPES,
} from '../../utils/companyVerification';
import { FILE_HINTS } from '../../utils/validateFile';
import { formatRelativeTime } from '../../utils/formatDate';
import { PREVIEW_COMPANY_PROFILE, PREVIEW_COMPANY_VERIFICATION } from '../../constants/preview';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { getOrgLabels, isOrganizationProfile } from '../../utils/orgLabels';

function DocumentBlock({
  title,
  description,
  typeLabel,
  typeOptions,
  typeValue,
  onTypeChange,
  file,
  onFileChange,
  accept,
  fileHint,
  allowImages = false,
  error,
  disabled = false,
}) {
  const inputRef = useRef(null);

  const handleChange = (event) => {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) {
      onFileChange(null);
      return;
    }

    const validation = validateVerificationFile(selected, { allowImages });
    if (!validation.valid) {
      onFileChange(null, validation.error);
      return;
    }

    onFileChange(selected, null);
    event.target.value = '';
  };

  return (
    <Card padding="lg" className="space-y-4">
      <div>
        <h3 className="text-body font-semibold text-app-text">{title}</h3>
        <p className="mt-1 text-body-small text-app-muted">{description}</p>
      </div>

      <Select
        label={typeLabel}
        value={typeValue}
        onChange={(event) => onTypeChange(event.target.value)}
        options={typeOptions}
        disabled={disabled}
        required
      />

      <div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={handleChange}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          className="inline-flex items-center gap-2"
          onClick={() => inputRef.current?.click()}
        >
          <AppIcon icon={Upload} size={ICON_SIZES.default} />
          Seleccionar archivo
        </Button>
        {file ? (
          <p className="mt-2 text-body-small text-app-text">
            Archivo seleccionado: <span className="font-medium">{file.name}</span>
          </p>
        ) : (
          <p className="mt-2 text-caption text-app-subtle">Ningún archivo seleccionado</p>
        )}
        {fileHint ? <p className="mt-1 text-caption text-app-subtle">{fileHint}</p> : null}
        {error ? <p className="mt-2 text-caption text-error-600">{error}</p> : null}
      </div>
    </Card>
  );
}

export default function Verification() {
  const { user, isPreviewMode } = useAuth();
  const { showToast } = useNotificationContext();
  const [companyProfile, setCompanyProfile] = useState(null);
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [companyDocType, setCompanyDocType] = useState('nif');
  const [representativeDocType, setRepresentativeDocType] = useState('dip');
  const [companyFile, setCompanyFile] = useState(null);
  const [representativeFile, setRepresentativeFile] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const loadData = useCallback(async () => {
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
  }, [isPreviewMode, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const verificationStatus = getVerificationStatus(companyProfile);
  const verified = isCompanyVerified(companyProfile);
  const canSubmit = !verified && verificationStatus !== 'pending';

  const orgLabels = getOrgLabels(companyProfile);
  const verificationTitle = isOrganizationProfile(companyProfile)
    ? 'Verificación de organización'
    : 'Verificación de cuenta Business';

  const validateForm = useMemo(() => {
    return () => {
      const errors = {};
      if (!companyFile) errors.companyFile = 'Sube el documento de la empresa.';
      if (!representativeFile) errors.representativeFile = 'Sube el documento del representante.';
      return errors;
    };
  }, [companyFile, representativeFile]);

  const handleFileChange = (field, file, uploadError) => {
    if (uploadError) {
      setFormErrors((prev) => ({ ...prev, [field]: uploadError }));
      if (field === 'companyFile') setCompanyFile(null);
      if (field === 'representativeFile') setRepresentativeFile(null);
      return;
    }

    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

    if (field === 'companyFile') setCompanyFile(file);
    if (field === 'representativeFile') setRepresentativeFile(file);
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (isPreviewMode) {
      showToast('Modo vista previa: la solicitud no se enviará', 'info');
      return;
    }

    setSubmitting(true);

    const [{ data: companyUpload, error: companyUploadError }, { data: repUpload, error: repUploadError }] =
      await Promise.all([
        storageService.uploadVerificationDoc(
          user.id,
          companyFile,
          request?.company_document_path ?? request?.verification_document_path,
        ),
        storageService.uploadRepresentativeVerificationDoc(
          user.id,
          representativeFile,
          request?.representative_document_path,
        ),
      ]);

    if (companyUploadError || repUploadError) {
      setSubmitting(false);
      showToast(
        getSupabaseErrorMessage(companyUploadError || repUploadError),
        'error',
      );
      return;
    }

    const { error } = await verificationService.submitRequest({
      companyDocumentType: companyDocType,
      companyDocumentPath: companyUpload?.path,
      representativeDocumentType: representativeDocType,
      representativeDocumentPath: repUpload?.path,
      companyDocumentName: companyFile.name,
      representativeDocumentName: representativeFile.name,
    });

    setSubmitting(false);

    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }

    showToast('Solicitud enviada correctamente.', 'success');
    setCompanyFile(null);
    setRepresentativeFile(null);
    await loadData();
  };

  const renderContent = () => {
    if (verified) {
      return (
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center gap-3">
            <VerifiedBadge size="md" tooltip={orgLabels.verified} />
            <div>
              <p className="font-semibold text-gray-900">{orgLabels.verified} ✅</p>
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
          <Badge variant="pending" label="Verificación en revisión" />
          <p className="text-sm text-gray-700">
            Tu solicitud está siendo revisada. Te avisaremos cuando haya una resolución.
          </p>
          {request?.document_name && (
            <p className="text-xs text-gray-500">Documentos: {request.document_name}</p>
          )}
          {request?.created_at && (
            <p className="text-xs text-gray-400">
              Enviada {formatRelativeTime(request.created_at)}
            </p>
          )}
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {verificationStatus === 'rejected' && (
          <Card padding="lg" className="space-y-3">
            <Badge variant="error" label="Rechazada" />
            <p className="text-sm text-gray-700">
              Tu solicitud fue rechazada. Puedes corregir los documentos y volver a enviarla.
            </p>
            {(request?.rejection_reason || request?.review_notes) && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {request.rejection_reason || request.review_notes}
              </div>
            )}
          </Card>
        )}

        <DocumentBlock
          title="Documento de la empresa"
          description="Sube el NIF o la Licencia Comercial de tu empresa."
          typeLabel="Tipo de documento"
          typeOptions={COMPANY_DOCUMENT_TYPES}
          typeValue={companyDocType}
          onTypeChange={setCompanyDocType}
          file={companyFile}
          onFileChange={(file, err) => handleFileChange('companyFile', file, err)}
          accept={VERIFICATION_ACCEPT}
          fileHint={FILE_HINTS.verification}
          error={formErrors.companyFile}
        />

        <DocumentBlock
          title="Documento del representante"
          description="Sube el DIP o el Pasaporte de la persona que representa a la empresa."
          typeLabel="Tipo de documento"
          typeOptions={REPRESENTATIVE_DOCUMENT_TYPES}
          typeValue={representativeDocType}
          onTypeChange={setRepresentativeDocType}
          file={representativeFile}
          onFileChange={(file, err) => handleFileChange('representativeFile', file, err)}
          accept={REPRESENTATIVE_DOC_ACCEPT}
          fileHint="PDF o imágenes • Max 5 MB"
          allowImages
          error={formErrors.representativeFile}
        />

        <Button fullWidth loading={submitting} onClick={handleSubmit}>
          Enviar solicitud de verificación
        </Button>
      </div>
    );
  };

  return (
    <PageContainer title={verificationTitle} backButton bottomNav={false}>
      <div className="space-y-space-base p-space-base">
        {loading ? (
          <FormPageSkeleton fields={3} />
        ) : (
          <>
            <div className="flex items-start gap-space-md">
              <AppIcon icon={ShieldCheck} size={ICON_SIZES.lg} className="text-primary-600" />
              <div>
                <h2 className="text-title font-semibold text-app-text">{verificationTitle}</h2>
                <p className="mt-space-xs text-body-small text-app-muted">
                  La verificación ayuda a generar confianza entre candidatos y empresas.
                </p>
                {!verified && canSubmit && (
                  <p className="mt-space-xs text-body-small text-app-muted">
                    Obtén el distintivo de verificación y destaca tu perfil frente a los candidatos.
                  </p>
                )}
              </div>
            </div>
            {renderContent()}
          </>
        )}
      </div>
    </PageContainer>
  );
}
