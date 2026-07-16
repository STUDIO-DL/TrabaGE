import AppIcon from '../../common/AppIcon';
import {
  Calendar,
  Globe,
  Mail,
  MapPin,
  Phone,
  Users,
  ICON_SIZES,
} from '../../../constants/icons';
import { getCompanyLocationText } from '../../../utils/companyProfile';

function normalizeWebsiteHref(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

function formatWebsiteDisplay(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function InfoRow({ icon, label, value, href }) {
  if (!value) return null;

  const content = (
    <div className="flex min-h-touch items-center gap-space-md py-space-sm">
      <AppIcon icon={icon} size={ICON_SIZES.md} className="shrink-0 text-app-subtle" />
      <div className="min-w-0 flex-1">
        <p className="text-caption text-app-subtle">{label}</p>
        <p
          className={`truncate text-body-small font-medium ${
            href ? 'text-primary-600' : 'text-app-text'
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel="noopener noreferrer"
        className="block transition-opacity duration-fast hover:opacity-80"
      >
        {content}
      </a>
    );
  }

  return content;
}

export default function CompanyInfoRows({ profile, variant = 'minimal' }) {
  const location = getCompanyLocationText(profile);
  const website = profile?.website?.trim();
  const websiteHref = normalizeWebsiteHref(website);
  const email = profile?.contact_email?.trim();
  const phone = profile?.contact_phone?.trim() || profile?.contact_whatsapp?.trim();
  const phoneHref = profile?.contact_phone?.trim()
    ? `tel:${profile.contact_phone.replace(/\s/g, '')}`
    : profile?.contact_whatsapp?.trim()
      ? `https://wa.me/${profile.contact_whatsapp.replace(/\D/g, '')}`
      : null;

  const rows = [
    {
      key: 'website',
      icon: Globe,
      label: 'Sitio web',
      value: formatWebsiteDisplay(website),
      href: websiteHref,
      show: Boolean(website),
    },
    {
      key: 'email',
      icon: Mail,
      label: 'Correo',
      value: email,
      href: email ? `mailto:${email}` : null,
      show: Boolean(email),
    },
    {
      key: 'phone',
      icon: Phone,
      label: 'Teléfono',
      value: phone,
      href: phoneHref,
      show: Boolean(phone),
    },
    {
      key: 'location',
      icon: MapPin,
      label: 'Ubicación',
      value: location !== 'Ubicación no especificada' ? location : null,
      show: location !== 'Ubicación no especificada',
    },
    {
      key: 'founded',
      icon: Calendar,
      label: 'Fundada',
      value: profile?.founded_year ? String(profile.founded_year) : null,
      show: Boolean(profile?.founded_year),
    },
    {
      key: 'size',
      icon: Users,
      label: 'Tamaño',
      value: profile?.company_size?.trim() || null,
      show: Boolean(profile?.company_size?.trim()),
    },
  ];

  const visibleRows = rows.filter((row) => row.show);

  if (variant === 'minimal' && visibleRows.length === 0) return null;

  return (
    <div className="divide-y divide-app-border">
      {visibleRows.map((row) => (
        <InfoRow
          key={row.key}
          icon={row.icon}
          label={row.label}
          value={row.value}
          href={row.href}
        />
      ))}
    </div>
  );
}
