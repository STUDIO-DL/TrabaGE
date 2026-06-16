const MAX_SIZES = {
  cv: 5 * 1024 * 1024,
  avatar: 2 * 1024 * 1024,
  logo: 2 * 1024 * 1024,
  postImage: 3 * 1024 * 1024,
  verification: 5 * 1024 * 1024,
  document: 5 * 1024 * 1024,
  image: 3 * 1024 * 1024,
};

const ALLOWED_TYPES = {
  cv: ['application/pdf'],
  document: ['application/pdf'],
  avatar: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  logo: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  postImage: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  verification: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
};

export const FILE_HINTS = {
  cv: 'PDF • Max 5 MB',
  document: 'PDF • Max 5 MB',
  avatar: 'Max 2 MB',
  logo: 'Max 2 MB',
  postImage: 'Max 3 MB',
  image: 'Max 3 MB',
  verification: 'PDF, PNG, JPG • Max 5 MB',
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
      return { valid: false, error: 'Formato no válido. Usa PDF, PNG, JPG o JPEG.' };
    }
    return { valid: false, error: 'Tipo de archivo no permitido.' };
  }

  if (file.size > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `El archivo supera el límite de ${maxMb} MB.` };
  }

  return { valid: true, error: null };
};
