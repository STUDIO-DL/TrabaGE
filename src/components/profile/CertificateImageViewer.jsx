import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { resolveCertificationImageUrl } from '../../utils/storagePaths';

/**
 * Deferred certificate image viewer — resolves and loads the image only when opened.
 */
export default function CertificateImageViewer({ isOpen, onClose, imagePath, title }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageReady, setImageReady] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setImageUrl(null);
      setLoading(false);
      setError('');
      setImageReady(false);
      return;
    }

    if (!imagePath) {
      setError('No hay imagen de certificado disponible.');
      return;
    }

    setLoading(true);
    setError('');
    setImageReady(false);

    const url = resolveCertificationImageUrl(imagePath);
    if (!url) {
      setLoading(false);
      setError('No se pudo cargar el certificado.');
      return;
    }

    setImageUrl(url);
  }, [isOpen, imagePath]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Certificado'} size="lg">
      <div className="flex min-h-[12rem] flex-col items-center justify-center">
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {!error && imageUrl && (
          <>
            {loading && !imageReady && (
              <p className="mb-4 text-sm text-app-muted" aria-live="polite">
                Cargando certificado…
              </p>
            )}
            <img
              src={imageUrl}
              alt={title || 'Certificado'}
              className={`max-h-[min(70vh,36rem)] w-full object-contain ${imageReady ? '' : 'opacity-0'}`}
              onLoad={() => {
                setImageReady(true);
                setLoading(false);
              }}
              onError={() => {
                setLoading(false);
                setError('No se pudo cargar la imagen del certificado.');
              }}
            />
          </>
        )}
      </div>
    </Modal>
  );
}
