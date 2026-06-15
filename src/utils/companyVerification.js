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

export const VERIFICATION_ACCEPT = '.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';

export const VERIFICATION_MAX_BYTES = 10 * 1024 * 1024;

export function validateVerificationFile(file) {
  if (!file) return { valid: false, error: 'Selecciona un archivo.' };

  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension)) {
    return { valid: false, error: 'Formato no válido. Usa PDF, PNG, JPG o JPEG.' };
  }

  if (file.size > VERIFICATION_MAX_BYTES) {
    return { valid: false, error: 'El archivo supera el límite de 10 MB.' };
  }

  return { valid: true };
}
