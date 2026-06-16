export const REPORT_TARGET_TYPES = {
  PROFILE: 'profile',
  POST: 'post',
  JOB: 'job',
};

export const REPORT_REASONS = [
  { code: 'identity_impersonation', label: 'Suplantación de identidad' },
  { code: 'fraud', label: 'Fraude o estafa' },
  { code: 'inappropriate_content', label: 'Contenido inapropiado' },
  { code: 'spam', label: 'Spam' },
  { code: 'false_information', label: 'Información falsa' },
  { code: 'harassment', label: 'Acoso o comportamiento abusivo' },
  { code: 'other', label: 'Otro', requiresDetails: true },
];

export function getReportReasonLabel(code) {
  return REPORT_REASONS.find((r) => r.code === code)?.label ?? code;
}

export function reportReasonRequiresDetails(code) {
  return REPORT_REASONS.find((r) => r.code === code)?.requiresDetails ?? false;
}
