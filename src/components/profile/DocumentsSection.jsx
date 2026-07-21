import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileSectionCard from './ProfileSectionCard';
import FileUpload from '../ui/FileUpload';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import AppIcon from '../common/AppIcon';
import { FileText, ICON_SIZES } from '../../constants/icons';
import { FILE_HINTS } from '../../utils/validateFile';
import { getUploadPhaseLabel } from '../../constants/uploadPhases';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { loadCvGeneratorModal } from '../../features/cv-generator/loadCvGeneratorModal';
import { getCvReadiness, goToCvReadinessTarget } from '../../features/cv-generator/cvReadiness';
import CvIncompleteProfileModal from '../../features/cv-generator/CvIncompleteProfileModal';

const CvGeneratorModal = lazy(async () => {
  const Component = await loadCvGeneratorModal();
  return { default: Component };
});

function CoverLetterEditor({ initialValue, saving, onSave }) {
  const [value, setValue] = useState(initialValue ?? '');

  useEffect(() => {
    setValue(initialValue ?? '');
  }, [initialValue]);

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        placeholder="Escribe tu carta de presentación..."
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={saving}
        onClick={() => onSave?.(value)}
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
  onSaveCoverLetter,
  onRefetchProfile,
  cvLoading = false,
  cvPhase = null,
  coverSaving = false,
}) {
  const navigate = useNavigate();
  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const [firstMissingTarget, setFirstMissingTarget] = useState(null);

  if (!isOwn) return null;

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

  return (
    <ProfileSectionCard
      id="documents"
      icon={PROFILE_SECTION_ICONS.document}
      iconTone="document"
      title="Documentos"
    >
      <div className="space-y-5">
        <div>
          <p className="mb-1 text-sm font-semibold text-gray-900">Curriculum Vitae</p>
          <p className="mb-3 text-sm text-gray-500">
            Sube tu CV en formato PDF para compartirlo con empresas.
          </p>
          <p className="mb-1 text-xs text-gray-500">{FILE_HINTS.cv}</p>
          <p className="mb-4 text-sm text-gray-500">{cvName || 'No especificado'}</p>

          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
            <p className="text-sm font-medium text-gray-900">¿No tienes un CV?</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
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
                label={cvName ? 'Reemplazar CV' : 'Subir CV'}
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

        <div className="border-t border-gray-100 pt-5">
          <p className="mb-1 text-sm font-medium text-gray-700">Carta de presentación (texto)</p>
          <p className="mb-3 text-xs text-gray-500">
            Se guarda en tu perfil como texto, sin ocupar almacenamiento extra.
          </p>
          <CoverLetterEditor
            initialValue={coverLetter}
            saving={coverSaving}
            onSave={onSaveCoverLetter}
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
