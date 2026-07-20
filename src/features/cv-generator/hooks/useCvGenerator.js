import { useCallback, useEffect, useRef, useState } from 'react';
import { buildCvData, sanitizeCvFilename } from '../buildCvData';
import { fetchAvatarDataUri } from '../fetchAvatarDataUri';
import { generateCvPdf } from '../generateCvPdf';

export function useCvGenerator({ profile, accountEmail, onUploadCV, refetchProfile }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [filename, setFilename] = useState('CV-TrabaGE.pdf');
  const [isSparse, setIsSparse] = useState(false);
  const [uploading, setUploading] = useState(false);
  const previewUrlRef = useRef(null);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, []);

  const reset = useCallback(() => {
    revokePreview();
    setBlob(null);
    setStatus('idle');
    setError(null);
    setIsSparse(false);
    setUploading(false);
  }, [revokePreview]);

  const generate = useCallback(async () => {
    setStatus('generating');
    setError(null);
    revokePreview();
    setBlob(null);

    try {
      const freshProfile = refetchProfile ? await refetchProfile() : profile;
      const sourceProfile = freshProfile ?? profile;
      const cvData = buildCvData(sourceProfile, accountEmail);

      const avatarDataUri = await fetchAvatarDataUri(cvData.avatarUrl);
      const pdfBlob = await generateCvPdf({ ...cvData, avatarDataUri });

      const nextFilename = sanitizeCvFilename(cvData.fullName);
      const url = URL.createObjectURL(pdfBlob);
      previewUrlRef.current = url;

      setBlob(pdfBlob);
      setPreviewUrl(url);
      setFilename(nextFilename);
      setIsSparse(cvData.isSparse);
      setStatus('ready');
    } catch (generateError) {
      setStatus('error');
      setError(generateError?.message || 'No se pudo generar el CV. Inténtalo de nuevo.');
    }
  }, [accountEmail, profile, refetchProfile, revokePreview]);

  const download = useCallback(() => {
    if (!blob || !previewUrl) return;

    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [blob, filename, previewUrl]);

  const saveAsOfficialCv = useCallback(async () => {
    if (!blob || !onUploadCV) return { error: { message: 'No hay CV generado.' } };

    setUploading(true);
    const file = new File([blob], filename, { type: 'application/pdf' });
    const result = await onUploadCV(file);
    setUploading(false);
    return result;
  }, [blob, filename, onUploadCV]);

  useEffect(() => () => revokePreview(), [revokePreview]);

  return {
    status,
    error,
    previewUrl,
    filename,
    isSparse,
    uploading,
    generate,
    regenerate: generate,
    download,
    saveAsOfficialCv,
    reset,
  };
}
