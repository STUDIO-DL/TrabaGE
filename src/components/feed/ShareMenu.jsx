import { generateShareUrl } from '../../utils/generateShareUrl';
import AppIcon from '../common/AppIcon';
import { Copy, Mail, MessageCircle, ICON_SIZES } from '../../constants/icons';

export default function ShareMenu({ url, title }) {
  const shareUrl = url.startsWith('http') ? url : generateShareUrl(url);
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title || 'TrabaGE');

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
  };

  return (
    <div className="mt-2 flex flex-wrap gap-2 rounded-xl bg-gray-50 p-3">
      <a
        href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white"
      >
        <AppIcon icon={MessageCircle} size={ICON_SIZES.default} className="text-white" />
        WhatsApp
      </a>
      <a
        href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-white"
      >
        <AppIcon icon={Mail} size={ICON_SIZES.default} className="text-white" />
        Email
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white"
      >
        <AppIcon icon={Copy} size={ICON_SIZES.default} className="text-white" />
        Copiar enlace
      </button>
    </div>
  );
}
