import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import CvPdfDocument from './CvPdfDocument';
import { registerCvFonts } from './cvStyles';

function mapGenerateError(error) {
  const message = String(error?.message || error || '');
  if (
    message.includes('Offset is outside the bounds of the DataView') ||
    message.includes('DataView') ||
    message.includes('Base64 image invalid format') ||
    message.includes('Unknown font format')
  ) {
    return new Error(
      'No se pudo generar el CV por un recurso incompatible. Inténtalo de nuevo.',
    );
  }
  return error instanceof Error ? error : new Error(message || 'No se pudo generar el CV.');
}

/**
 * Builds the CV PDF blob. Avatar must already be a PNG/JPEG data URI (see fetchAvatarDataUri).
 * Fonts are registered as WOFF for mobile-safe parsing.
 */
export async function generateCvPdf(data) {
  const safeData = {
    ...data,
    avatarDataUri:
      typeof data?.avatarDataUri === 'string' &&
      (data.avatarDataUri.startsWith('data:image/png') ||
        data.avatarDataUri.startsWith('data:image/jpeg') ||
        data.avatarDataUri.startsWith('data:image/jpg'))
        ? data.avatarDataUri
        : null,
  };

  registerCvFonts();

  try {
    const instance = pdf(createElement(CvPdfDocument, { data: safeData }));
    return await instance.toBlob();
  } catch (error) {
    throw mapGenerateError(error);
  }
}
