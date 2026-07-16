import { useRef, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import FileUpload from '../ui/FileUpload';
import AppIcon from '../common/AppIcon';
import { FileText, ICON_SIZES } from '../../constants/icons';
import { FILE_HINTS } from '../../utils/validateFile';

export default function ApplyCvSelector({
  cvName,
  hasSavedCv,
  pendingFile,
  onSelectFile,
  onUploadError,
  uploading = false,
}) {
  const [showUpload, setShowUpload] = useState(!hasSavedCv);
  const uploadSectionRef = useRef(null);

  const displayName = pendingFile?.name ?? cvName ?? null;
  const needsCv = !hasSavedCv && !pendingFile;

  const handleChangeClick = () => {
    setShowUpload(true);
    requestAnimationFrame(() => {
      uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  return (
    <Card padding="md" className="space-y-space-md">
      <div className="flex items-start gap-space-md">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-radius-md bg-primary-50 text-primary-600"
          aria-hidden
        >
          <AppIcon icon={FileText} size={ICON_SIZES.md} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-button font-semibold text-app-text">Currículum</h3>
          <p className="mt-space-xs text-caption text-app-muted">
            {needsCv
              ? 'Necesitas un CV en PDF para enviar tu solicitud.'
              : 'Se enviará el CV seleccionado con tu candidatura.'}
          </p>
        </div>
      </div>

      {hasSavedCv && !showUpload && displayName ? (
        <div className="flex flex-wrap items-center gap-x-space-sm gap-y-space-xs rounded-radius-md border border-app-border bg-app-surface px-space-md py-space-sm">
          <span className="text-body-small text-app-text">
            CV seleccionado:{' '}
            <span className="font-medium">{displayName}</span>
          </span>
          <Button
            type="button"
            variant="text"
            size="sm"
            onClick={handleChangeClick}
            aria-label="Cambiar CV"
          >
            (Cambiar)
          </Button>
        </div>
      ) : null}

      {(showUpload || needsCv) && (
        <div ref={uploadSectionRef}>
          {pendingFile && hasSavedCv ? (
            <p className="mb-space-sm text-body-small text-app-text">
              Nuevo CV: <span className="font-medium">{pendingFile.name}</span>
            </p>
          ) : null}
          <FileUpload
            label={needsCv ? 'Subir CV' : 'Seleccionar otro PDF'}
            accept="application/pdf"
            fileType="cv"
            hint={FILE_HINTS.cv}
            loading={uploading}
            onUpload={(file, error) => {
              if (error) {
                onUploadError?.(error);
                return;
              }
              onSelectFile?.(file);
              onUploadError?.('');
            }}
          />
          {hasSavedCv && showUpload ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-space-sm"
              onClick={() => {
                setShowUpload(false);
                onSelectFile?.(null);
              }}
            >
              Usar CV guardado
            </Button>
          ) : null}
        </div>
      )}

      {needsCv ? (
        <p className="text-caption text-warning-700" role="status">
          Sube tu CV para continuar.
        </p>
      ) : null}
    </Card>
  );
}
