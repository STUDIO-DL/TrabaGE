import { useTimeAgo } from '../../hooks/useTimeAgo';
import { formatDate } from '../../utils/formatDate';

// Renders a human-friendly Spanish "time ago" label (e.g. "Hace 5 minutos")
// that auto-updates on a shared ticker. The exact date is kept in the title
// attribute for accessibility. Returns null for invalid/empty dates.
export default function TimeAgo({ date, className, as: Tag = 'span', ...rest }) {
  const label = useTimeAgo(date);
  if (!label) return null;

  const exactDate = date
    ? formatDate(date, { hour: '2-digit', minute: '2-digit' })
    : undefined;

  return (
    <Tag className={className} title={exactDate} {...rest}>
      {label}
    </Tag>
  );
}
