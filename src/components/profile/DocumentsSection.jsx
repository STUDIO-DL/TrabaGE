import { useEffect, useState } from 'react';
import ProfileSectionCard from './ProfileSectionCard';
import FileUpload from '../ui/FileUpload';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { FILE_HINTS } from '../../utils/validateFile';
import { getUploadPhaseLabel } from '../../constants/uploadPhases';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';

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
  cvName,
  coverLetter,
  isOwn,
  onUploadCV,
  onSaveCoverLetter,
  cvLoading = false,
  cvPhase = null,
  coverSaving = false,
}) {
  if (!isOwn) return null;

  return (
    <ProfileSectionCard icon={PROFILE_SECTION_ICONS.document} iconTone="document" title="Documentos">
      <div className="mb-5 rounded-xl border border-primary-100 bg-primary-50/60 p-4 text-left">
        <p className="text-sm font-medium text-primary-900">¿Por qué subirlos aquí?</p>
        <p className="mt-1.5 text-sm leading-relaxed text-primary-800/90">
          Guardar tu CV y carta de presentación en tu perfil te permite aplicar a ofertas más rápido,
          sin tener que adjuntarlos cada vez. Las empresas también podrán consultarlos cuando revisen
          tu solicitud.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">Currículum (PDF)</p>
          <p className="mb-1 text-xs text-gray-500">{FILE_HINTS.cv}</p>
          <p className="mb-3 text-sm text-gray-500">{cvName || 'No especificado'}</p>
          <FileUpload
            label={cvName ? 'Reemplazar CV' : 'Subir CV'}
            accept="application/pdf"
            fileType="cv"
            hint={FILE_HINTS.cv}
            loading={cvLoading}
            loadingLabel={getUploadPhaseLabel(cvPhase)}
            onUpload={(file, error) => onUploadCV?.(file, error)}
          />
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
    </ProfileSectionCard>
  );
}
