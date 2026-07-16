import Textarea from '../ui/Textarea';

export const COVER_LETTER_MAX_LENGTH = 1000;

export default function ApplyCoverLetter({ value, onChange, error }) {
  const charCount = value.length;
  const atLimit = charCount >= COVER_LETTER_MAX_LENGTH;

  return (
    <div>
      <Textarea
        id="apply-cover-letter"
        label="Carta de presentación (opcional)"
        value={value}
        onChange={(e) => {
          const next = e.target.value.slice(0, COVER_LETTER_MAX_LENGTH);
          onChange(next);
        }}
        rows={5}
        placeholder="Escribe un breve mensaje para presentarte a la empresa..."
        error={error}
        aria-describedby="apply-cover-letter-counter"
      />
      <p
        id="apply-cover-letter-counter"
        className={[
          'mt-space-xs text-right text-caption',
          atLimit ? 'text-warning-700' : 'text-app-subtle',
        ].join(' ')}
        aria-live="polite"
      >
        {charCount}/{COVER_LETTER_MAX_LENGTH}
      </p>
    </div>
  );
}
