/** @typedef {'whatsapp' | 'email' | 'phone'} ContactMethodId */

/** @typedef {{ id: ContactMethodId, label: string, emoji: string }} ContactMethodOption */

export const CONTACT_NO_METHODS_MESSAGE =
  'Este usuario aún no ha configurado ningún método de contacto.';

/** Personal / candidate profiles — WhatsApp + email only. */
export const PERSONAL_CONTACT_METHODS = ['whatsapp', 'email'];

/** Business / organization profiles — extend when wired in UI. */
export const BUSINESS_CONTACT_METHODS = ['whatsapp', 'email', 'phone'];

const CONTACT_METHOD_META = {
  whatsapp: { label: 'WhatsApp', emoji: '📱' },
  email: { label: 'Correo electrónico', emoji: '✉️' },
  phone: { label: 'Teléfono', emoji: '📞' },
};

/**
 * Reads normalized contact values from a profile object.
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {ContactMethodId[]} methodIds
 */
export function getProfileContactValues(profile, methodIds = PERSONAL_CONTACT_METHODS) {
  /** @type {Partial<Record<ContactMethodId, string>>} */
  const values = {};

  if (methodIds.includes('whatsapp')) {
    const digits = profile?.contact_whatsapp?.replace(/\D/g, '');
    if (digits) values.whatsapp = digits;
  }

  if (methodIds.includes('email')) {
    const email = profile?.contact_email?.trim();
    if (email) values.email = email;
  }

  if (methodIds.includes('phone')) {
    const phone = profile?.contact_phone?.replace(/\s/g, '');
    if (phone) values.phone = phone;
  }

  return values;
}

/**
 * Returns configured contact methods for a profile.
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {ContactMethodId[]} methodIds
 * @returns {ContactMethodOption[]}
 */
export function getAvailableContactMethods(profile, methodIds = PERSONAL_CONTACT_METHODS) {
  const values = getProfileContactValues(profile, methodIds);

  return methodIds
    .filter((id) => values[id])
    .map((id) => ({
      id,
      ...CONTACT_METHOD_META[id],
    }));
}

/**
 * Resolves how the contact action should behave.
 * @returns {{ action: 'direct', method: ContactMethodOption }
 *   | { action: 'choose', methods: ContactMethodOption[] }
 *   | { action: 'none' }}
 */
export function resolveContactAction(profile, methodIds = PERSONAL_CONTACT_METHODS) {
  const methods = getAvailableContactMethods(profile, methodIds);

  if (methods.length === 0) return { action: 'none' };
  if (methods.length === 1) return { action: 'direct', method: methods[0] };
  return { action: 'choose', methods };
}

/**
 * Opens a specific contact channel.
 * @param {ContactMethodId} methodId
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {ContactMethodId[]} methodIds
 * @returns {{ ok: boolean, error?: string }}
 */
export function openContactMethod(methodId, profile, methodIds = PERSONAL_CONTACT_METHODS) {
  const values = getProfileContactValues(profile, methodIds);

  if (methodId === 'whatsapp' && values.whatsapp) {
    window.open(`https://wa.me/${values.whatsapp}`, '_blank', 'noopener,noreferrer');
    return { ok: true };
  }

  if (methodId === 'email' && values.email) {
    window.location.href = `mailto:${values.email}`;
    return { ok: true };
  }

  if (methodId === 'phone' && values.phone) {
    window.location.href = `tel:${values.phone}`;
    return { ok: true };
  }

  return { ok: false, error: CONTACT_NO_METHODS_MESSAGE };
}

/**
 * Smart contact opener — direct when one method, otherwise signals caller to show picker.
 * @returns {{ ok: boolean, needsPicker?: boolean, methods?: ContactMethodOption[], error?: string }}
 */
export function openProfileContact(profile, methodIds = PERSONAL_CONTACT_METHODS) {
  const resolved = resolveContactAction(profile, methodIds);

  if (resolved.action === 'none') {
    return { ok: false, error: CONTACT_NO_METHODS_MESSAGE };
  }

  if (resolved.action === 'direct') {
    return openContactMethod(resolved.method.id, profile, methodIds);
  }

  return { ok: true, needsPicker: true, methods: resolved.methods };
}

/** @deprecated Prefer openProfileContact + useContactAction for multi-method profiles. */
export function openCandidateContact(profile) {
  const resolved = resolveContactAction(profile, PERSONAL_CONTACT_METHODS);

  if (resolved.action === 'direct') {
    return openContactMethod(resolved.method.id, profile, PERSONAL_CONTACT_METHODS);
  }

  if (resolved.action === 'choose') {
    return openContactMethod(resolved.methods[0].id, profile, PERSONAL_CONTACT_METHODS);
  }

  return { ok: false, error: CONTACT_NO_METHODS_MESSAGE };
}

export function hasCandidateContact(profile) {
  return getAvailableContactMethods(profile, PERSONAL_CONTACT_METHODS).length > 0;
}

/**
 * Opens WhatsApp, email or phone contact for a company profile.
 * Returns { ok, error }.
 */
export function openCompanyContact(profile) {
  const resolved = resolveContactAction(profile, BUSINESS_CONTACT_METHODS);

  if (resolved.action === 'direct') {
    return openContactMethod(resolved.method.id, profile, BUSINESS_CONTACT_METHODS);
  }

  if (resolved.action === 'choose') {
    return openContactMethod(resolved.methods[0].id, profile, BUSINESS_CONTACT_METHODS);
  }

  return { ok: false, error: 'Esta empresa no ha configurado un contacto.' };
}

export function hasCompanyActionableContact(profile) {
  return getAvailableContactMethods(profile, BUSINESS_CONTACT_METHODS).length > 0;
}
