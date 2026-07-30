import { formatMessageDaySeparator } from '../../utils/formatDate';

/** Discrete WhatsApp-style day chip between message groups. */
export default function MessageDaySeparator({ date }) {
  const label = formatMessageDaySeparator(date);
  if (!label) return null;

  return (
    <div className="flex justify-center py-space-md" role="separator" aria-label={label}>
      <span className="text-caption font-medium text-app-subtle">{label}</span>
    </div>
  );
}
