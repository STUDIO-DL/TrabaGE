export { buildCvData, sanitizeCvFilename } from './buildCvData';
export { fetchAvatarDataUri } from './fetchAvatarDataUri';
export { generateCvPdf } from './generateCvPdf';
export { improveCvWithAi } from './improveCvWithAi';

export async function loadCvGeneratorModal() {
  const module = await import('./CvGeneratorModal.jsx');
  return module.default;
}
