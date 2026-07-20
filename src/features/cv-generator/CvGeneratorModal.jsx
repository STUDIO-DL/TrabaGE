import { useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { useCvGenerator } from './hooks/useCvGenerator';

export default function CvGeneratorModal({
  isOpen,
  onClose,
  profile,
  accountEmail,
  onUploadCV,
  refetchProfile,
  cvLoading = false,
}) {
  const {
    status,
    error,
    previewUrl,
    uploading,
    generate,
    regenerate,
    download,
    saveAsOfficialCv,
    reset,
  } = useCvGenerator({ profile, accountEmail, onUploadCV, refetchProfile });

  useEffect(() => {
    if (isOpen && status === 'idle') {
      generate();
    }
  }, [isOpen, status, generate]);

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const handleUseCv = async () => {
    const result = await saveAsOfficialCv();
    if (!result?.error) {
      handleClose();
    }
  };

  const isBusy = status === 'generating' || uploading || cvLoading;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Tu CV generado" variant="sheet" size="lg">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {status === 'generating' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Spinner size="lg" />
            <p className="text-sm text-app-muted">Generando tu CV...</p>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-red-600">{error}</p>
            <Button type="button" variant="primary" fullWidth onClick={generate}>
              Reintentar
            </Button>
          </div>
        ) : null}

        {status === 'ready' && previewUrl ? (
          <>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="min-h-[50dvh] flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <iframe
                title="Vista previa del CV"
                src={previewUrl}
                className="h-[55dvh] w-full"
              />
            </div>

            {/* Future: "Mejorar CV con IA" button — see improveCvWithAi.js */}

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="primary"
                fullWidth
                className="sm:flex-1"
                disabled={isBusy}
                onClick={download}
              >
                Descargar
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                className="sm:flex-1"
                loading={status === 'generating'}
                disabled={isBusy}
                onClick={regenerate}
              >
                Regenerar
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                className="sm:flex-1"
                loading={uploading || cvLoading}
                disabled={isBusy}
                onClick={handleUseCv}
              >
                Usar este CV
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
