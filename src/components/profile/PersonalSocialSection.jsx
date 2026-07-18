import { useEffect, useState } from 'react';
import ProfileSectionCard from './ProfileSectionCard';
import Input from '../ui/Input';
import Button from '../ui/Button';
import AppIcon from '../common/AppIcon';
import { Save, ExternalLink, ICON_SIZES } from '../../constants/icons';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { getProfileSectionEmptyCopy } from '../../utils/copyLabels';
import { safeExternalUrl } from '../../utils/safeUrl';
import {
  PERSONAL_SOCIAL_NETWORKS,
  extractSocialHandle,
  hasPersonalSocialLinks,
  validatePersonalSocialForm,
} from '../../utils/socialLinks';

function InstagramIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function TikTokIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13.4a8.28 8.28 0 005.58 2.17V12.1a4.85 4.85 0 01-3.77-1.75V6.69h3.77z" />
    </svg>
  );
}

function YoutubeIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function FacebookIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

const NETWORK_ICONS = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YoutubeIcon,
  facebook: FacebookIcon,
};

function SocialListRow({ network, href }) {
  const safeHref = safeExternalUrl(href);
  if (!safeHref) return null;

  const Icon = NETWORK_ICONS[network.key];
  const handle = extractSocialHandle(safeHref, network.key, network.label);

  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-h-touch items-center gap-space-sm py-space-xs transition-colors duration-200 hover:bg-gray-50"
    >
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-radius-md ${network.activeClass}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-caption text-gray-500">{network.label}</p>
        <p className="truncate text-body-small font-medium text-gray-900">{handle}</p>
      </div>
      <AppIcon
        icon={ExternalLink}
        size={ICON_SIZES.sm}
        className="shrink-0 text-primary-600 opacity-80 transition-opacity duration-200 group-hover:opacity-100"
      />
    </a>
  );
}

function emptyForm(links = {}) {
  return {
    instagram: links.instagram || '',
    tiktok: links.tiktok || '',
    youtube: links.youtube || '',
    facebook: links.facebook || '',
  };
}

export default function PersonalSocialSection({
  socialLinks,
  isOwn,
  onSave,
  loading = false,
}) {
  const links = socialLinks ?? {};
  const hasLinks = hasPersonalSocialLinks({ social_links: links });
  const [form, setForm] = useState(() => emptyForm(links));
  const [dirty, setDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    setForm(emptyForm(socialLinks ?? {}));
    setDirty(false);
    setFieldErrors({});
  }, [socialLinks]);

  if (!isOwn && !hasLinks) return null;

  const handleSave = async () => {
    const { valid, errors, cleaned } = validatePersonalSocialForm(form);
    if (!valid) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    const result = await onSave?.({ social_links: cleaned });
    if (!result?.error) {
      setDirty(false);
    }
  };

  const setField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    setDirty(true);
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const activeNetworks = PERSONAL_SOCIAL_NETWORKS.filter((network) => links[network.key]);

  return (
    <ProfileSectionCard
      icon={PROFILE_SECTION_ICONS.social}
      iconTone="social"
      title="Redes sociales"
      isEmpty={!isOwn && !hasLinks}
      emptyText={getProfileSectionEmptyCopy('social', isOwn)}
    >
      {isOwn ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Añade enlaces a tus perfiles públicos. Solo se aceptan URLs seguras (https).
          </p>
          {PERSONAL_SOCIAL_NETWORKS.map((network) => (
            <Input
              key={network.key}
              label={network.label}
              type="url"
              placeholder={network.placeholder}
              value={form[network.key]}
              onChange={setField(network.key)}
              error={fieldErrors[network.key]}
            />
          ))}
          {dirty && (
            <Button type="button" fullWidth loading={loading} onClick={handleSave} className="gap-2">
              <AppIcon icon={Save} size={ICON_SIZES.default} className="text-white" />
              Guardar redes sociales
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {activeNetworks.map((network) => (
            <SocialListRow key={network.key} network={network} href={links[network.key]} />
          ))}
        </div>
      )}
    </ProfileSectionCard>
  );
}
