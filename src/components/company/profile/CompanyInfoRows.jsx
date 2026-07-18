import AppIcon from '../../common/AppIcon';
import {
  Briefcase,
  Calendar,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  Users,
  ICON_SIZES,
} from '../../../constants/icons';
import { getCompanyLocationText, getCompanySectorText } from '../../../utils/companyProfile';

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

function InfoRow({ icon, label, value, href, external = false }) {
  if (!value) return null;

  const content = (
    <div className="flex min-h-touch items-start gap-space-sm py-space-xs">
      <AppIcon icon={icon} size={ICON_SIZES.md} className="mt-0.5 shrink-0 text-app-subtle" />
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
      {external && href && (
        <AppIcon icon={ExternalLink} size={ICON_SIZES.sm} className="mt-1 shrink-0 text-primary-600" />
      )}
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel="noopener noreferrer"
        className="block rounded-radius-sm transition-opacity duration-fast hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        {content}
      </a>
    );
  }

  return content;
}

export default function CompanyInfoRows({ profile, variant = 'minimal' }) {
  const location = getCompanyLocationText(profile);
  const sector = getCompanySectorText(profile);
  const website = profile?.website?.trim();
  const websiteHref = normalizeWebsiteHref(website);
  const email = profile?.contact_email?.trim();
  const phone = profile?.contact_phone?.trim() || profile?.contact_whatsapp?.trim();
  const phoneHref = profile?.contact_phone?.trim()
    ? `tel:${profile.contact_phone.replace(/\s/g, '')}`
    : profile?.contact_whatsapp?.trim()
      ? `https://wa.me/${profile.contact_whatsapp.replace(/\D/g, '')}`
      : null;
  const address = profile?.address?.trim();
  const excludeHeaderMeta = variant === 'inicio';

  const rows = [
    {
      key: 'website',
      icon: Globe,
      label: 'Sitio web',
      value: formatWebsiteDisplay(website),
      href: websiteHref,
      show: Boolean(website),
      external: true,
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
      value: address || location || null,
      show: Boolean(address) || (!excludeHeaderMeta && Boolean(location)),
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
      show: Boolean(profile?.company_size?.trim()) && !excludeHeaderMeta,
    },
    {
      key: 'sector',
      icon: Briefcase,
      label: 'Sector',
      value: sector || null,
      show: Boolean(sector) && !excludeHeaderMeta,
    },
  ];

  const visibleRows = rows.filter((row) => row.show);

  if ((variant === 'minimal' || variant === 'inicio') && visibleRows.length === 0) return null;

  return (
    <div className="divide-y divide-app-border">
      {visibleRows.map((row) => (
        <InfoRow
          key={row.key}
          icon={row.icon}
          label={row.label}
          value={row.value}
          href={row.href}
          external={row.external}
        />
      ))}
    </div>
  );
}

export function hasVisibleCompanyInfoRows(profile, variant = 'minimal') {
  const location = getCompanyLocationText(profile);
  const sector = getCompanySectorText(profile);
  const website = profile?.website?.trim();
  const email = profile?.contact_email?.trim();
  const phone = profile?.contact_phone?.trim() || profile?.contact_whatsapp?.trim();
  const address = profile?.address?.trim();
  const excludeHeaderMeta = variant === 'inicio';

  const checks = [
    Boolean(website),
    Boolean(email),
    Boolean(phone),
    Boolean(address) || (!excludeHeaderMeta && Boolean(location)),
    Boolean(profile?.founded_year),
    Boolean(profile?.company_size?.trim()) && !excludeHeaderMeta,
    Boolean(sector) && !excludeHeaderMeta,
  ];

  return checks.some(Boolean);
}
