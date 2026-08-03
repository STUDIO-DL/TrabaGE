import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileSectionCard from './ProfileSectionCard';
import FileUpload from '../ui/FileUpload';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import AppIcon from '../common/AppIcon';
import { Eye, FileText, Lock, Trash2, ICON_SIZES } from '../../constants/icons';
import { FILE_HINTS } from '../../utils/validateFile';
import { getUploadPhaseLabel } from '../../constants/uploadPhases';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { loadCvGeneratorModal } from '../../features/cv-generator/loadCvGeneratorModal';
import { getCvReadiness, goToCvReadinessTarget } from '../../features/cv-generator/cvReadiness';
import CvIncompleteProfileModal from '../../features/cv-generator/CvIncompleteProfileModal';
import { STORAGE_BUCKETS } from '../../constants/storage';
import { storageService } from '../../services/storage.service';
import { resolveCvBucket } from '../../utils/storagePaths';
import { useNotificationContext } from '../../context/NotificationContext';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { FORM_DRAFT_KEYS } from '../../constants/formDrafts';
import { DRAFT_RESTORED_MESSAGE, useFormDraft } from '../../hooks/useFormDraft';
import { useAuth } from '../../hooks/useAuth';

const CvGeneratorModal = lazy(async () => {
  const Component = await loadCvGeneratorModal();
  return { default: Component };
});

function hasStoredCv(profile, cvName) {
  const path = String(profile?.cv_path ?? '').trim();
  const name = String(cvName ?? profile?.cv_name ?? '').trim();
  return Boolean(path || name);
}

function CoverLetterEditor({ initialValue, saving, onSave, userId }) {
  const { showToast } = useNotificationContext();
  const {
    values: letterDraft,
    setValues: setLetterDraft,
    clearDraft,
  } = useFormDraft({
    draftKey: FORM_DRAFT_KEYS.coverLetter,
    userId,
    initialValues: { text: initialValue ?? '' },
    enabled: Boolean(userId),
    onRestored: (message) => showToast(message || DRAFT_RESTORED_MESSAGE, 'info'),
  });
  const value = letterDraft.text ?? '';

  useEffect(() => {
    if ((letterDraft.text ?? '').trim()) return;
    setLetterDraft({ text: initialValue ?? '' });
  }, [initialValue, letterDraft.text, setLetterDraft]);

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => setLetterDraft({ text: e.target.value })}
        rows={5}
        placeholder="Escribe tu carta de presentación..."
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={saving}
        onClick={async () => {
          const result = await onSave?.(value);
          if (!result?.error) clearDraft();
        }}
      >
        Guardar carta
      </Button>
    </div>
  );
}

export default function DocumentsSection({
  profile,
  accountEmail,
  cvName,
  coverLetter,
  isOwn,
  onUploadCV,
  onDeleteCV,
  onSaveCoverLetter,
  onRefetchProfile,
  cvLoading = false,
  cvPhase = null,
  cvDeleting = false,
  coverSaving = false,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotificationContext();
  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const [firstMissingTarget, setFirstMissingTarget] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  if (!isOwn) return null;

  const hasCv = hasStoredCv(profile, cvName);
  const displayCvName = String(cvName ?? profile?.cv_name ?? '').trim() || 'CV.pdf';

  const handleGenerateClick = () => {
    const { ready, missing } = getCvReadiness(profile);
    if (!ready) {
      setFirstMissingTarget(missing[0]?.target ?? '/personal/profile');
      setIncompleteOpen(true);
      return;
    }
    setCvModalOpen(true);
  };

  const handleCompleteProfile = () => {
    setIncompleteOpen(false);
    goToCvReadinessTarget(firstMissingTarget, navigate);
  };

  const handleViewCv = async () => {
    const path = String(profile?.cv_path ?? '').trim();
    if (!path) {
      showToast('No se encontró el archivo del CV.', 'error');
      return;
    }
    setViewLoading(true);
    const bucket = resolveCvBucket(path) || STORAGE_BUCKETS.CANDIDATE_CVS;
    const { data, error } = await storageService.getSignedUrl(bucket, path, 900);
    setViewLoading(false);
    if (error || !data?.signedUrl) {
      showToast(getSupabaseErrorMessage(error, 'No se pudo abrir el CV.'), 'error');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteCv = async () => {
    if (!hasCv || !onDeleteCV) return;
    const confirmed = window.confirm(
      '¿Eliminar tu CV? Podrás volver a subir o generar uno cuando quieras.',
    );
    if (!confirmed) return;
    await onDeleteCV();
  };

  return (
    <ProfileSectionCard
      id="documents"
      icon={PROFILE_SECTION_ICONS.document}
      iconTone="document"
      title="Documentos"
    >
      <div className="space-y-5">
        <div>
          <p className="mb-1 text-sm font-semibold text-app-text">Curriculum Vitae</p>
          <p className="mb-3 flex items-start gap-space-sm text-caption leading-relaxed text-app-subtle">
            <AppIcon
              icon={Lock}
              size={ICON_SIZES.sm}
              className="mt-0.5 shrink-0 text-app-subtle"
              aria-hidden
            />
            <span>
              Tu CV es privado. Solo se compartirá con una empresa u organización cuando tú
              decidas utilizarlo para postularte a una oferta de empleo.
            </span>
          </p>

          {hasCv ? (
            <div className="space-y-3">
              <div className="flex items-start gap-space-sm rounded-radius-md border border-app-border bg-app-surface/80 px-space-md py-space-sm">
                <AppIcon
                  icon={FileText}
                  size={ICON_SIZES.md}
                  className="mt-0.5 shrink-0 text-primary-600"
                  aria-hidden
                />
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-app-text">
                  {displayCvName}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  className="sm:flex-1"
                  loading={viewLoading}
                  disabled={!String(profile?.cv_path ?? '').trim()}
                  onClick={handleViewCv}
                >
                  <AppIcon icon={Eye} size={ICON_SIZES.default} />
                  Ver CV
                </Button>
                <div className="w-full sm:flex-1">
                  <FileUpload
                    label="Reemplazar CV"
                    accept="application/pdf"
                    fileType="cv"
                    hint={FILE_HINTS.cv}
                    loading={cvLoading}
                    loadingLabel={getUploadPhaseLabel(cvPhase)}
                    onUpload={(file, error) => onUploadCV?.(file, error)}
                    fullWidth
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-error-600 hover:bg-error-50 hover:text-error-700 sm:flex-1"
                  loading={cvDeleting}
                  disabled={cvLoading}
                  onClick={handleDeleteCv}
                >
                  <AppIcon icon={Trash2} size={ICON_SIZES.default} />
                  Eliminar CV
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-app-border bg-app-surface/80 p-4">
                <p className="text-sm font-medium text-app-text">¿No tienes un CV?</p>
                <p className="mt-1 text-sm leading-relaxed text-app-muted">
                  Genera uno automáticamente utilizando la información de tu perfil.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  className="sm:flex-1"
                  onClick={handleGenerateClick}
                >
                  <AppIcon icon={FileText} size={ICON_SIZES.default} />
                  Generar CV
                </Button>
                <div className="w-full sm:flex-1">
                  <FileUpload
                    label="Subir CV"
                    accept="application/pdf"
                    fileType="cv"
                    hint={FILE_HINTS.cv}
                    loading={cvLoading}
                    loadingLabel={getUploadPhaseLabel(cvPhase)}
                    onUpload={(file, error) => onUploadCV?.(file, error)}
                    fullWidth
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-app-divider pt-5">
          <p className="mb-1 text-sm font-medium text-app-text">Carta de presentación (texto)</p>
          <p className="mb-3 text-xs text-app-muted">
            Se guarda en tu perfil como texto, sin ocupar almacenamiento extra.
          </p>
          <CoverLetterEditor
            initialValue={coverLetter}
            saving={coverSaving}
            onSave={onSaveCoverLetter}
            userId={user?.id}
          />
        </div>
      </div>

      <CvIncompleteProfileModal
        isOpen={incompleteOpen}
        onClose={() => setIncompleteOpen(false)}
        onComplete={handleCompleteProfile}
      />

      {cvModalOpen ? (
        <Suspense fallback={null}>
          <CvGeneratorModal
            isOpen={cvModalOpen}
            onClose={() => setCvModalOpen(false)}
            profile={profile}
            accountEmail={accountEmail}
            onUploadCV={onUploadCV}
            refetchProfile={onRefetchProfile}
            cvLoading={cvLoading}
          />
        </Suspense>
      ) : null}
    </ProfileSectionCard>
  );
}
