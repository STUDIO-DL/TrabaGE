import { useEffect, useRef, useState } from 'react';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import AppIcon from '../../common/AppIcon';
import { Save, Upload, X, ICON_SIZES } from '../../../constants/icons';
import { validateFile, FILE_HINTS } from '../../../utils/validateFile';
import { resolveCertificationImageUrl } from '../../../utils/storagePaths';
import { certificationImagePath } from '../../../constants/storage';
import { storageService } from '../../../services/storage.service';
import { getUploadPhaseLabel } from '../../../constants/uploadPhases';
import { useAuth } from '../../../hooks/useAuth';

const CREDENTIAL_ID_MAX = 120;

const empty = {
  name: '',
  issuer: '',
  issued_date: '',
  expires_at: '',
  credential_id: '',
};

export default function CertificationModal({
  isOpen,
  onClose,
  initial,
  onSave,
  loading,
  userId,
}) {
  const { user } = useAuth();
  const resolvedUserId = userId || user?.id;
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(empty);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setForm(
      initial
        ? {
            name: initial.name || '',
            issuer: initial.issuer || '',
            issued_date: initial.issued_date || '',
            expires_at: initial.expires_at || '',
            credential_id: initial.credential_id || '',
          }
        : empty,
    );
    setImageFile(null);
    setRemoveExistingImage(false);
    setImagePreview(
      initial?.image_path ? resolveCertificationImageUrl(initial.image_path) : null,
    );
    setError('');
    setUploading(false);
    setUploadPhase(null);
  }, [isOpen, initial]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageSelect = (file) => {
    if (!file) return;

    const validation = validateFile(file, 'certificationImage');
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setError('');
    setRemoveExistingImage(false);
    setImageFile(file);
    setImagePreview((current) => {
      if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };

  const handleFileInputChange = (event) => {
    handleImageSelect(event.target.files?.[0]);
    event.target.value = '';
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview((current) => {
      if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
      return null;
    });
    if (initial?.image_path) {
      setRemoveExistingImage(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!resolvedUserId) {
      setError('No se pudo identificar al usuario.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      issuer: form.issuer.trim() || null,
      issued_date: form.issued_date || null,
      expires_at: form.expires_at || null,
      credential_id: form.credential_id.trim().slice(0, CREDENTIAL_ID_MAX) || null,
    };

    setUploading(true);
    setUploadPhase(null);
    setError('');

    const { data, error: saveError } = await onSave(payload, initial?.id);
    if (saveError) {
      setUploading(false);
      setUploadPhase(null);
      setError(saveError.message);
      return;
    }

    const certificationId = data?.id || initial?.id;
    if (!certificationId) {
      setUploading(false);
      setUploadPhase(null);
      setError('No se pudo guardar el certificado.');
      return;
    }

    try {
      if (imageFile) {
        const { error: uploadError } = await storageService.uploadCertificationImage(
          resolvedUserId,
          certificationId,
          imageFile,
          initial?.image_path,
          { onProgress: ({ phase }) => setUploadPhase(phase) },
        );
        if (uploadError) {
          setError(uploadError.message || 'No se pudo subir el certificado.');
          setUploading(false);
          setUploadPhase(null);
          return;
        }

        const nextPath = certificationImagePath(resolvedUserId, certificationId);
        const { error: patchError } = await onSave(
          { image_path: nextPath },
          certificationId,
          { silent: true },
        );
        if (patchError) {
          setError(patchError.message);
          setUploading(false);
          setUploadPhase(null);
          return;
        }
      } else if (removeExistingImage && initial?.image_path) {
        await storageService.deleteCertificationImage(
          resolvedUserId,
          certificationId,
          initial.image_path,
        );
        const { error: patchError } = await onSave(
          { image_path: null },
          certificationId,
          { silent: true },
        );
        if (patchError) {
          setError(patchError.message);
          setUploading(false);
          setUploadPhase(null);
          return;
        }
      }
    } catch (uploadErr) {
      setError(uploadErr.message || 'No se pudo subir el certificado.');
      setUploading(false);
      setUploadPhase(null);
      return;
    }

    setUploading(false);
    setUploadPhase(null);
    onClose();
  };

  const busy = loading || uploading;
  const hasPreview = Boolean(imagePreview);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initial ? 'Editar certificación' : 'Añadir certificación'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre del certificado"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          label="Organización emisora"
          value={form.issuer}
          onChange={(e) => setForm({ ...form, issuer: e.target.value })}
        />
        <Input
          label="Fecha de emisión"
          type="date"
          value={form.issued_date}
          onChange={(e) => setForm({ ...form, issued_date: e.target.value })}
        />
        <Input
          label="Fecha de expiración"
          type="date"
          value={form.expires_at}
          onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
        />
        <Input
          label="ID del certificado"
          value={form.credential_id}
          onChange={(e) =>
            setForm({ ...form, credential_id: e.target.value.slice(0, CREDENTIAL_ID_MAX) })
          }
          maxLength={CREDENTIAL_ID_MAX}
          placeholder="Opcional"
        />

        <div>
          <p className="mb-2 text-sm font-medium text-app-text">Subir certificado</p>
          {hasPreview ? (
            <div className="relative overflow-hidden rounded-radius-md border border-app-divider">
              <img
                src={imagePreview}
                alt="Vista previa del certificado"
                className="max-h-48 w-full object-contain bg-app-surface"
              />
              <div className="absolute right-2 top-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-circular bg-black/55 text-white"
                  aria-label="Cambiar certificado"
                  disabled={busy}
                >
                  <AppIcon icon={Upload} size={ICON_SIZES.sm} />
                </button>
                <button
                  type="button"
                  onClick={clearImage}
                  className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-circular bg-black/55 text-white"
                  aria-label="Quitar certificado"
                  disabled={busy}
                >
                  <AppIcon icon={X} size={ICON_SIZES.sm} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-radius-md border border-dashed border-app-border bg-app-surface px-4 py-8 text-app-muted transition-colors hover:border-primary-300 hover:text-primary-700"
            >
              <AppIcon icon={Upload} size={ICON_SIZES.lg} />
              <span className="text-sm font-medium">Subir certificado</span>
              <span className="text-xs">{FILE_HINTS.certificationImage}</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleFileInputChange}
            disabled={busy}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" fullWidth loading={busy} className="gap-2">
          <AppIcon icon={Save} size={ICON_SIZES.default} className="text-white" />
          {busy ? getUploadPhaseLabel(uploadPhase) || 'Guardando...' : 'Guardar'}
        </Button>
      </form>
    </Modal>
  );
}
