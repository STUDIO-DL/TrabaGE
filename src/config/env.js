/** Ignore placeholder values left in .env from .env.example */
export function isPlaceholderEnvValue(value) {
  if (!value?.trim()) return true;

  const lower = value.trim().toLowerCase();
  return (
    lower.includes('your-') ||
    lower.includes('placeholder') ||
    lower.includes('example.com')
  );
}

export function readViteEnv(value) {
  const trimmed = value?.trim() || '';
  return isPlaceholderEnvValue(trimmed) ? '' : trimmed;
}
