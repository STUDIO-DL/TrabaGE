const MAX_SIZES = {
  avatar: 2 * 1024 * 1024,
  document: 5 * 1024 * 1024,
  image: 5 * 1024 * 1024,
};

const ALLOWED_TYPES = {
  avatar: ['image/jpeg', 'image/png', 'image/webp'],
  document: ['application/pdf'],
  image: ['image/jpeg', 'image/png', 'image/webp'],
};

export const validateFile = (file, type = 'document') => {
  if (!file) return { valid: false, error: 'No se seleccionó ningún archivo.' };

  const allowed = ALLOWED_TYPES[type] || ALLOWED_TYPES.document;
  const maxSize = MAX_SIZES[type] || MAX_SIZES.document;

  if (!allowed.includes(file.type)) {
    return { valid: false, error: 'Tipo de archivo no permitido.' };
  }

  if (file.size > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `El archivo supera el límite de ${maxMb}MB.` };
  }

  return { valid: true, error: null };
};
