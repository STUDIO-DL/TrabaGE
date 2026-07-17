import { useRef } from 'react';
import Button from '../../ui/Button';
import AppIcon from '../../common/AppIcon';
import { FileText, Image, Trash2, Upload, ICON_SIZES } from '../../../constants/icons';
import { validateFile } from '../../../utils/validateFile';
import { formatFileSize } from '../../../utils/formatFileSize';

export const MAX_EDUCATION_FILES = 5;

function fileIcon(mimeType) {
  if (mimeType?.startsWith('image/')) return Image;
  return FileText;
}

export default function EducationFilesField({
  existingFiles = [],
  pendingFiles = [],
  onAddPending,
  onRemoveExisting,
  onRemovePending,
  error,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const totalCount = existingFiles.length + pendingFiles.length;
  const atLimit = totalCount >= MAX_EDUCATION_FILES;

  const handlePick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || disabled || atLimit) return;

    const validation = validateFile(file, 'educationAttachment');
    if (!validation.valid) {
      onAddPending?.(null, validation.error);
      return;
    }

    onAddPending?.(file, null);
  };

  return (
    <div className="w-full">
      <div className="mb-space-sm flex items-center justify-between gap-space-sm">
        <p className="text-label text-app-muted">Archivos</p>
        <span className="text-caption text-app-subtle">
          {totalCount}/{MAX_EDUCATION_FILES}
        </span>
      </div>

      {(existingFiles.length > 0 || pendingFiles.length > 0) && (
        <ul className="mb-space-sm space-y-space-xs" aria-label="Archivos adjuntos">
          {existingFiles.map((file) => {
            const Icon = fileIcon(file.mimeType);
            return (
              <li
                key={file.path}
                className="flex min-w-0 items-center gap-space-sm rounded-radius-md border border-app-border bg-app-surface px-space-sm py-space-sm"
              >
                <AppIcon icon={Icon} size={ICON_SIZES.md} className="shrink-0 text-primary-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-small text-app-text">{file.name}</p>
                  <p className="truncate text-caption text-app-subtle">{formatFileSize(file.size)}</p>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onRemoveExisting?.(file.path)}
                    className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm text-app-subtle transition-colors hover:bg-error-50 hover:text-error-600"
                    aria-label={`Eliminar ${file.name}`}
                  >
                    <AppIcon icon={Trash2} size={ICON_SIZES.sm} />
                  </button>
                )}
              </li>
            );
          })}

          {pendingFiles.map((file) => {
            const Icon = fileIcon(file.type);
            return (
              <li
                key={file.clientId}
                className="flex min-w-0 items-center gap-space-sm rounded-radius-md border border-dashed border-primary-200 bg-primary-50/40 px-space-sm py-space-sm"
              >
                <AppIcon icon={Icon} size={ICON_SIZES.md} className="shrink-0 text-primary-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-small text-app-text">{file.name}</p>
                  <p className="truncate text-caption text-app-subtle">
                    {formatFileSize(file.size)} · Pendiente
                  </p>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onRemovePending?.(file.clientId)}
                    className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm text-app-subtle transition-colors hover:bg-error-50 hover:text-error-600"
                    aria-label={`Quitar ${file.name}`}
                  >
                    <AppIcon icon={Trash2} size={ICON_SIZES.sm} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handlePick}
        disabled={disabled || atLimit}
      />

      {!atLimit && !disabled && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="inline-flex items-center gap-space-sm"
          onClick={() => inputRef.current?.click()}
        >
          <AppIcon icon={Upload} size={ICON_SIZES.default} />
          Añadir archivo
        </Button>
      )}

      <p className="mt-space-xs text-caption text-app-subtle">
        PDF o imágenes · Máx. 5 MB por archivo
      </p>

      {error && (
        <p className="mt-space-xs text-caption text-error-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
