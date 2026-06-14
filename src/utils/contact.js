/**
 * Opens WhatsApp or email contact for a candidate profile.
 * Returns { ok, error }.
 */
export function openCandidateContact(profile) {
  const whatsapp = profile?.contact_whatsapp?.replace(/\D/g, '');
  const email = profile?.contact_email?.trim();

  if (whatsapp) {
    window.open(`https://wa.me/${whatsapp}`, '_blank', 'noopener,noreferrer');
    return { ok: true };
  }

  if (email) {
    window.location.href = `mailto:${email}`;
    return { ok: true };
  }

  return { ok: false, error: 'Este candidato no ha configurado un contacto.' };
}

export function hasCandidateContact(profile) {
  return Boolean(profile?.contact_whatsapp?.trim() || profile?.contact_email?.trim());
}
