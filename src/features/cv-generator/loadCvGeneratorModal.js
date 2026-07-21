/** Tiny entry so the profile route does not import @react-pdf/renderer. */
export async function loadCvGeneratorModal() {
  const module = await import('./CvGeneratorModal.jsx');
  return module.default;
}
