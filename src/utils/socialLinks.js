export const PERSONAL_SOCIAL_ALLOWED_HOSTS = {
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'],
  facebook: ['facebook.com', 'fb.com'],
};

export const COMPANY_SOCIAL_ALLOWED_HOSTS = {
  linkedin: ['linkedin.com'],
  facebook: ['facebook.com'],
  instagram: ['instagram.com'],
  x: ['x.com', 'twitter.com'],
  youtube: ['youtube.com', 'youtu.be'],
  tiktok: ['tiktok.com'],
};

export const COMPANY_SOCIAL_NETWORKS = [
  {
    key: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/company/...',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    placeholder: 'https://facebook.com/...',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/...',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@tuusuario',
  },
  {
    key: 'x',
    label: 'X / Twitter',
    placeholder: 'https://x.com/...',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    placeholder: 'https://youtube.com/...',
  },
];

export const PERSONAL_SOCIAL_NETWORKS = [
  {
    key: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/tuusuario',
    activeClass: 'bg-[#E4405F]/10 text-[#E4405F]',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@tuusuario',
    activeClass: 'bg-app-surface text-app-text',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    placeholder: 'https://youtube.com/@tucanal',
    activeClass: 'bg-[#FF0000]/10 text-[#FF0000]',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    placeholder: 'https://facebook.com/tuusuario',
    activeClass: 'bg-[#1877F2]/10 text-[#1877F2]',
  },
];

function cleanText(value) {
  const trimmed = value?.trim?.() ?? '';
  return trimmed || null;
}

export function cleanHttpsUrl(value, allowedHosts = null) {
  const trimmed = cleanText(value);
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return null;

    if (allowedHosts?.length) {
      const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
      const allowed = allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
      if (!allowed) return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

export function cleanPersonalSocialLinks(form) {
  const links = {
    instagram: cleanHttpsUrl(form.instagram, PERSONAL_SOCIAL_ALLOWED_HOSTS.instagram),
    tiktok: cleanHttpsUrl(form.tiktok, PERSONAL_SOCIAL_ALLOWED_HOSTS.tiktok),
    youtube: cleanHttpsUrl(form.youtube, PERSONAL_SOCIAL_ALLOWED_HOSTS.youtube),
    facebook: cleanHttpsUrl(form.facebook, PERSONAL_SOCIAL_ALLOWED_HOSTS.facebook),
  };

  return Object.fromEntries(Object.entries(links).filter(([, value]) => Boolean(value)));
}

export function cleanCompanySocialLinks(form) {
  const links = Object.fromEntries(
    COMPANY_SOCIAL_NETWORKS.map((network) => [
      network.key,
      cleanHttpsUrl(form[network.key], COMPANY_SOCIAL_ALLOWED_HOSTS[network.key]),
    ]),
  );

  return Object.fromEntries(Object.entries(links).filter(([, value]) => Boolean(value)));
}

export function hasCompanySocialLinks(profile) {
  const links = profile?.social_links ?? {};
  return COMPANY_SOCIAL_NETWORKS.some((network) => links[network.key]);
}

export function validateCompanySocialForm(form) {
  const errors = {};

  for (const network of COMPANY_SOCIAL_NETWORKS) {
    const raw = form[network.key]?.trim?.() ?? '';
    if (!raw) continue;

    const cleaned = cleanHttpsUrl(raw, COMPANY_SOCIAL_ALLOWED_HOSTS[network.key]);
    if (!cleaned) {
      errors[network.key] = `URL de ${network.label} no válida. Usa https://...`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    cleaned: cleanCompanySocialLinks(form),
  };
}

export function hasPersonalSocialLinks(profile) {
  const links = profile?.social_links ?? {};
  return PERSONAL_SOCIAL_NETWORKS.some((network) => links[network.key]);
}

export function validatePersonalSocialForm(form) {
  const errors = {};

  for (const network of PERSONAL_SOCIAL_NETWORKS) {
    const raw = form[network.key]?.trim?.() ?? '';
    if (!raw) continue;

    const cleaned = cleanHttpsUrl(raw, PERSONAL_SOCIAL_ALLOWED_HOSTS[network.key]);
    if (!cleaned) {
      errors[network.key] = `URL de ${network.label} no válida. Usa https://...`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    cleaned: cleanPersonalSocialLinks(form),
  };
}

export function extractSocialHandle(url, networkKey, label) {
  if (!url) return label;
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (networkKey === 'linkedin') {
      if (parts[0] === 'company' && parts[1]) return parts[1];
      return parts[parts.length - 1] || label;
    }
    if (networkKey === 'instagram' || networkKey === 'tiktok' || networkKey === 'x') {
      const handle = parts[0]?.replace(/^@/, '');
      return handle ? `@${handle}` : label;
    }
    if (networkKey === 'youtube') {
      if (parts[0] === 'channel' && parts[1]) return parts[1];
      if (parts[0]?.startsWith('@')) return parts[0];
      return parts[0] || label;
    }
    return parts[0] || parsed.hostname.replace(/^www\./, '') || label;
  } catch {
    return label;
  }
}
