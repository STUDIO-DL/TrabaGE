/** Append non-secret Supabase/Postgres hints in development for faster debugging. */
export function withDevDiagnostics(message, error) {
  if (!import.meta.env.DEV || !error) return message;

  const parts = [message];
  const code = error?.code ? `[${error.code}]` : '';
  const hint = error?.hint ? ` hint: ${error.hint}` : '';
  const details = error?.details ? ` details: ${error.details}` : '';
  const raw = String(error?.message || '').trim();

  if (raw && !message.includes(raw)) {
    parts.push(`${code} ${raw}${details}${hint}`.trim());
  } else if (code) {
    parts.push(`${code}${details}${hint}`.trim());
  }

  return parts.filter(Boolean).join(' — ');
}
