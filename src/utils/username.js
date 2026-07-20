export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const USERNAME_PATTERN = /^[a-zA-Z0-9._]+$/;

export function stripUsernameAt(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
}

/**
 * Client-side validation. Returns { valid, error } with Spanish messages.
 *
 * Usernames are share-link identifiers only — never render them in the UI.
 */
export function validateUsername(raw) {
  const value = stripUsernameAt(raw);

  if (!value) {
    return { valid: false, error: 'Introduce un nombre de usuario.' };
  }
  if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) {
    return {
      valid: false,
      error: `El nombre de usuario debe tener entre ${USERNAME_MIN} y ${USERNAME_MAX} caracteres.`,
    };
  }
  if (/\s/.test(value) || !USERNAME_PATTERN.test(value)) {
    return {
      valid: false,
      error: 'Solo se permiten letras, números, punto y guion bajo. Sin espacios.',
    };
  }

  return { valid: true, value, error: null };
}

export function mapUsernameRpcError(error) {
  const message = error?.message || '';
  if (message.includes('USERNAME_TAKEN')) {
    return 'Este nombre de usuario ya está en uso.';
  }
  if (message.includes('USERNAME_RESERVED')) {
    return 'Este nombre de usuario no está disponible.';
  }
  if (message.includes('USERNAME_INVALID_LENGTH')) {
    return `El nombre de usuario debe tener entre ${USERNAME_MIN} y ${USERNAME_MAX} caracteres.`;
  }
  if (message.includes('USERNAME_INVALID_FORMAT')) {
    return 'Solo se permiten letras, números, punto y guion bajo. Sin espacios.';
  }
  return error?.message || 'No se pudo guardar el nombre de usuario.';
}

/** Normalize search query: "@david" → "david" for matching. */
export function normalizeSearchUsernameQuery(query) {
  return stripUsernameAt(query);
}
