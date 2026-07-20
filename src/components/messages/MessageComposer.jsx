import { useState } from 'react';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { MESSAGE_MAX_LENGTH } from '../../services/messages.service';

export default function MessageComposer({ onSend, sending = false, disabled = false }) {
  const [value, setValue] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || sending || disabled) return;

    const result = await onSend(trimmed);
    if (!result?.error) {
      setValue('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-app-border bg-app-card px-space-base py-space-md"
    >
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Escribe un mensaje…"
        rows={2}
        maxLength={MESSAGE_MAX_LENGTH}
        disabled={disabled || sending}
        className="mb-space-sm min-h-[44px] resize-none"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void handleSubmit(event);
          }
        }}
      />
      <div className="flex justify-end">
        <Button type="submit" loading={sending} disabled={disabled || !value.trim()}>
          Enviar
        </Button>
      </div>
    </form>
  );
}
