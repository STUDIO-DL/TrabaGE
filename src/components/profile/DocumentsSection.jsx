import ProfileSectionCard from './ProfileSectionCard';
import FileUpload from '../ui/FileUpload';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';

const MAX_FILE_SIZE_LABEL = '2 MB';

export default function DocumentsSection({
  cvName,
  coverLetterName,
  isOwn,
  onUploadCV,
  onUploadCoverLetter,
  cvLoading = false,
  coverLoading = false,
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

      <p className="mb-4 text-xs text-gray-500">
        Sube archivos PDF. Tamaño máximo: {MAX_FILE_SIZE_LABEL} por archivo.
      </p>

      <div className="space-y-5">
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">Currículum (PDF)</p>
          <p className="mb-3 text-sm text-gray-500">{cvName || 'No especificado'}</p>
          <FileUpload
            label={cvName ? 'Reemplazar CV' : 'Subir CV'}
            accept="application/pdf"
            fileType="document"
            maxSize={MAX_FILE_SIZE_LABEL}
            loading={cvLoading}
            onUpload={(file, error) => onUploadCV?.(file, error)}
          />
        </div>

        <div className="border-t border-gray-100 pt-5">
          <p className="mb-1 text-sm font-medium text-gray-700">Carta de presentación (PDF)</p>
          <p className="mb-3 text-sm text-gray-500">{coverLetterName || 'No especificado'}</p>
          <FileUpload
            label={coverLetterName ? 'Reemplazar carta' : 'Subir carta'}
            accept="application/pdf"
            fileType="document"
            maxSize={MAX_FILE_SIZE_LABEL}
            loading={coverLoading}
            onUpload={(file, error) => onUploadCoverLetter?.(file, error)}
          />
        </div>
      </div>
    </ProfileSectionCard>
  );
}
