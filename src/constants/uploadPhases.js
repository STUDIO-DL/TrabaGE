export const UPLOAD_PHASES = {
  COMPRESSING: 'compressing',
  UPLOADING: 'uploading',
};

export const UPLOAD_PHASE_LABELS = {
  [UPLOAD_PHASES.COMPRESSING]: 'Optimizando archivo...',
  [UPLOAD_PHASES.UPLOADING]: 'Subiendo...',
};

export function getUploadPhaseLabel(phase) {
  if (!phase) return null;
  return UPLOAD_PHASE_LABELS[phase] ?? UPLOAD_PHASE_LABELS[UPLOAD_PHASES.UPLOADING];
}
