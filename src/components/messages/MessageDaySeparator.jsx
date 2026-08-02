import { formatMessageDaySeparator } from '../../utils/formatDate';

/** Discrete WhatsApp-style day chip between message groups. */
export default function MessageDaySeparator({ date }) {
  const label = formatMessageDaySeparator(date);
  if (!label) return null;

  return (
    <div className="flex justify-center py-space-md" role="separator" aria-label={label}>
      <span className="rounded-radius-circular bg-white/95 px-space-md py-1 text-caption font-medium text-app-muted shadow-sm ring-1 ring-app-border/80 dark:bg-app-elevated/95 dark:text-app-muted dark:ring-app-border">
        {label}
      </span>
    </div>
  );
}
