import AppIcon from '../../common/AppIcon';
import {
  ExternalLink,
  ICON_SIZES,
} from '../../../constants/icons';
import { getCompanyLocationText, getCompanySectorText } from '../../../utils/companyProfile';
import { companyAnalyticsService } from '../../../features/company-analytics/companyAnalytics.service';

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

function InfoRow({ label, value, href, external = false, onClick }) {
  if (!value) return null;

  const content = (
    <div className="flex min-h-touch items-start gap-space-sm py-space-sm">
      <div className="min-w-0 flex-1">
        <p className="text-caption text-app-subtle">{label}</p>
        <p
          className={`text-user-content text-body-small font-medium ${
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
        onClick={onClick}
        className="block rounded-radius-sm transition-opacity duration-fast hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        {content}
      </a>
    );
  }

  return content;
}

export default function CompanyInfoRows({ profile, variant = 'minimal', companyId = null, trackClicks = false }) {
  const location = getCompanyLocationText(profile);
  const sector = getCompanySectorText(profile);
  const website = profile?.website?.trim();
  const websiteHref = normalizeWebsiteHref(website);
  const address = profile?.address?.trim();
  const excludeHeaderMeta = variant === 'inicio';

  const rows = [
    {
      key: 'website',
      label: 'Sitio web',
      value: formatWebsiteDisplay(website),
      href: websiteHref,
      show: Boolean(website),
      external: true,
    },
    {
      key: 'location',
      label: 'Ubicación',
      value: address || location || null,
      show: Boolean(address) || (!excludeHeaderMeta && Boolean(location)),
    },
    {
      key: 'founded',
      label: 'Fundada',
      value: profile?.founded_year ? String(profile.founded_year) : null,
      show: Boolean(profile?.founded_year),
    },
    {
      key: 'size',
      label: 'Tamaño',
      value: profile?.company_size?.trim() || null,
      show: Boolean(profile?.company_size?.trim()) && !excludeHeaderMeta,
    },
    {
      key: 'sector',
      label: 'Sector',
      value: sector || null,
      show: Boolean(sector) && !excludeHeaderMeta,
    },
  ];

  const visibleRows = rows.filter((row) => row.show);

  if ((variant === 'minimal' || variant === 'inicio') && visibleRows.length === 0) return null;

  const handleWebsiteClick = () => {
    if (!trackClicks || !companyId) return;
    void companyAnalyticsService.trackWebsiteClick(companyId, { source: 'company_info_rows' });
  };

  return (
    <div className="divide-y divide-app-border">
      {visibleRows.map((row) => (
        <InfoRow
          key={row.key}
          label={row.label}
          value={row.value}
          href={row.href}
          external={row.external}
          onClick={row.key === 'website' ? handleWebsiteClick : undefined}
        />
      ))}
    </div>
  );
}

export function hasVisibleCompanyInfoRows(profile, variant = 'minimal') {
  const location = getCompanyLocationText(profile);
  const sector = getCompanySectorText(profile);
  const website = profile?.website?.trim();
  const address = profile?.address?.trim();
  const excludeHeaderMeta = variant === 'inicio';

  const checks = [
    Boolean(website),
    Boolean(address) || (!excludeHeaderMeta && Boolean(location)),
    Boolean(profile?.founded_year),
    Boolean(profile?.company_size?.trim()) && !excludeHeaderMeta,
    Boolean(sector) && !excludeHeaderMeta,
  ];

  return checks.some(Boolean);
}
