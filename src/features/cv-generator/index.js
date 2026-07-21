export { buildCvData, sanitizeCvFilename } from './buildCvData';
export { fetchAvatarDataUri } from './fetchAvatarDataUri';
export { improveCvWithAi } from './improveCvWithAi';
export { getCvReadiness, goToCvReadinessTarget } from './cvReadiness';

/** Lazy — keeps @react-pdf/renderer out of the profile route chunk. */
export async function loadCvGeneratorModal() {
  const module = await import('./CvGeneratorModal.jsx');
  return module.default;
}

export async function generateCvPdf(data) {
  const module = await import('./generateCvPdf.js');
  return module.generateCvPdf(data);
}
