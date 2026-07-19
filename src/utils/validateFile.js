import { UPLOAD_INPUT_MAX_BYTES } from '../constants/compressionPresets';

const MAX_SIZES = {
  cv: UPLOAD_INPUT_MAX_BYTES.cv,
  avatar: UPLOAD_INPUT_MAX_BYTES.image,
  logo: UPLOAD_INPUT_MAX_BYTES.image,
  postImage: UPLOAD_INPUT_MAX_BYTES.image,
  verification: UPLOAD_INPUT_MAX_BYTES.verification,
  document: UPLOAD_INPUT_MAX_BYTES.cv,
  image: UPLOAD_INPUT_MAX_BYTES.image,
  educationAttachment: UPLOAD_INPUT_MAX_BYTES.educationAttachment,
};

const ALLOWED_TYPES = {
  cv: ['application/pdf'],
  document: ['application/pdf'],
  avatar: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  logo: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  postImage: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  verification: ['application/pdf'],
  educationAttachment: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
  ],
};

export const FILE_HINTS = {
  cv: 'PDF • Max 2 MB (se optimiza al subir)',
  document: 'PDF • Max 2 MB',
  avatar: 'JPG, PNG o WebP • Se optimiza al subir',
  logo: 'JPG, PNG o WebP • Se optimiza al subir',
  postImage: 'JPG, PNG o WebP • Se optimiza al subir',
  image: 'JPG, PNG o WebP • Se optimiza al subir',
  verification: 'PDF • Max 10 MB (objetivo 2 MB)',
  educationAttachment: 'PDF o imágenes • Max 2 MB (se optimiza al subir)',
};

const TYPE_ALIASES = {
  document: 'cv',
};

export const validateFile = (file, type = 'document') => {
  if (!file) return { valid: false, error: 'No se seleccionó ningún archivo.' };

  const resolvedType = TYPE_ALIASES[type] || type;
  const allowed = ALLOWED_TYPES[resolvedType] || ALLOWED_TYPES.document;
  const maxSize = MAX_SIZES[resolvedType] || MAX_SIZES.document;

  if (!allowed.includes(file.type)) {
    if (resolvedType === 'cv' || resolvedType === 'document') {
      return { valid: false, error: 'Solo se permiten archivos PDF.' };
    }
    if (resolvedType === 'verification') {
      return { valid: false, error: 'Solo se permiten documentos PDF.' };
    }
    if (resolvedType === 'educationAttachment') {
      return { valid: false, error: 'Solo se permiten PDF o imágenes (JPG, PNG, WebP).' };
    }
    return { valid: false, error: 'Tipo de archivo no permitido.' };
  }

  if (file.size > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `El archivo supera el límite de ${maxMb} MB.` };
  }

  return { valid: true, error: null };
};
