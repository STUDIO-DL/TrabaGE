export function isCompanyVerified(company) {
  return company?.is_verified === true;
}

export function getVerificationStatus(company) {
  return company?.verification_status ?? mapLegacyStatus(company?.verified_status);
}

function mapLegacyStatus(verifiedStatus) {
  switch (verifiedStatus) {
    case 'verified':
      return 'approved';
    case 'pending':
      return 'pending';
    case 'rejected':
      return 'rejected';
    default:
      return 'not_submitted';
  }
}

export const VERIFICATION_BUCKET = 'company-verifications';

export const COMPANY_DOCUMENT_TYPES = [
  { value: 'nif', label: 'NIF' },
  { value: 'licencia_comercial', label: 'Licencia Comercial' },
];

export const REPRESENTATIVE_DOCUMENT_TYPES = [
  { value: 'dip', label: 'DIP' },
  { value: 'pasaporte', label: 'Pasaporte' },
];

export const VERIFICATION_ACCEPT = '.pdf,application/pdf';
export const REPRESENTATIVE_DOC_ACCEPT =
  '.pdf,application/pdf,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';

export const VERIFICATION_MAX_BYTES = 10 * 1024 * 1024;
export const VERIFICATION_OUTPUT_MAX_BYTES = 2 * 1024 * 1024;

const PDF_TYPES = ['application/pdf'];
const REPRESENTATIVE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
];

export function validateVerificationFile(file, { allowImages = false } = {}) {
  if (!file) return { valid: false, error: 'Selecciona un archivo.' };

  const allowedTypes = allowImages ? REPRESENTATIVE_TYPES : PDF_TYPES;
  const allowedExtensions = allowImages
    ? ['.pdf', '.jpg', '.jpeg', '.png', '.webp']
    : ['.pdf'];
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: allowImages
        ? 'Solo se permiten PDF o imágenes (JPG, PNG, WebP).'
        : 'Solo se permiten documentos PDF.',
    };
  }

  if (file.size > VERIFICATION_MAX_BYTES) {
    return { valid: false, error: 'El archivo supera el límite de 10 MB.' };
  }

  return { valid: true };
}

export function getVerificationStatusLabel(status, { verifiedLabel = 'Empresa verificada' } = {}) {
  switch (status) {
    case 'approved':
      return `${verifiedLabel} ✅`;
    case 'pending':
      return 'Verificación en revisión';
    case 'rejected':
      return 'Verificación rechazada';
    default:
      return 'Sin verificar';
  }
}
