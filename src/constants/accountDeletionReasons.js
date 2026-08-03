/** Exit-survey reasons shown during self-serve account deletion. */
export const ACCOUNT_DELETION_REASONS = [
  { code: 'found_job', label: 'Encontré trabajo.' },
  { code: 'no_longer_need', label: 'Ya no necesito la aplicación.' },
  { code: 'no_interesting_opportunities', label: 'No encontré oportunidades interesantes.' },
  { code: 'technical_issues', label: 'Tuve problemas técnicos.' },
  { code: 'privacy_concerns', label: 'Me preocupa mi privacidad.' },
  { code: 'too_many_notifications', label: 'Recibo demasiadas notificaciones.' },
  { code: 'creating_another_account', label: 'Crearé otra cuenta.' },
  { code: 'did_not_meet_expectations', label: 'La aplicación no cumplió mis expectativas.' },
  { code: 'other', label: 'Otro.', allowsOther: true },
];

export const ACCOUNT_DELETION_REASON_CODES = ACCOUNT_DELETION_REASONS.map((r) => r.code);

export function getAccountDeletionReasonLabel(code) {
  return ACCOUNT_DELETION_REASONS.find((r) => r.code === code)?.label ?? code ?? '—';
}

export function accountDeletionReasonAllowsOther(code) {
  return ACCOUNT_DELETION_REASONS.find((r) => r.code === code)?.allowsOther ?? false;
}

export const ACCOUNT_TYPE_LABELS = {
  personal: 'Personal',
  business: 'Empresa',
  organization: 'Organización',
  admin: 'Admin',
  unknown: 'Desconocido',
};

export function getAccountTypeLabel(type) {
  return ACCOUNT_TYPE_LABELS[type] ?? type ?? '—';
}
