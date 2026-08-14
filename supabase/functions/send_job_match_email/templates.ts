export function buildJobMatchSubject(jobTitle: string, opts: { sourceType?: string; company?: string; publisherName?: string } = {}) {
  const title = String(jobTitle ?? '').slice(0, 80);
  const { sourceType, company, publisherName } = opts;
  if (sourceType === 'company' && company) {
    return `Nueva oferta de empleo en ${company} — ${title}`;
  }
  if (sourceType === 'user' && publisherName) {
    return `Nueva oportunidad compartida por ${publisherName} — ${title}`;
  }
  return `Nueva oportunidad para ti en TrabaGE — ${title}`;
}

export function buildJobMatchText({ name, jobTitle, company, location, modality, url, sourceType, publisherName }: {
  name: string;
  jobTitle: string;
  company: string;
  location: string;
  modality: string;
  url: string;
  sourceType?: string;
  publisherName?: string;
}) {
  const header = sourceType === 'company' && company
    ? `${jobTitle}\n${company}`
    : sourceType === 'user' && publisherName
    ? `${jobTitle}\npublicada por ${publisherName}`
    : jobTitle;

  return `Hola ${name || ''},\n\nHemos encontrado una oportunidad que coincide con tu perfil.\n\n${header}\n${location || ''}\n${modality || ''}\n\nVer oferta: ${url}\n\nPuedes gestionar tus preferencias desde la configuración de tu cuenta en TrabaGE.`;
}

export function buildJobMatchHtml({ name, jobTitle, company, location, modality, url, sourceType, publisherName }: {
  name: string;
  jobTitle: string;
  company: string;
  location: string;
  modality: string;
  url: string;
  sourceType?: string;
  publisherName?: string;
}) {
  const safeName = name || '';
  const safeCompany = company || '';
  const safeLocation = location || '';
  const safeModality = modality || '';
  const safeUrl = url || '#';

  const headerLine = sourceType === 'company' && safeCompany
    ? `<strong>${safeCompany}</strong> — ${safeLocation} · ${safeModality}`
    : sourceType === 'user' && publisherName
    ? `publicada por <strong>${publisherName}</strong> — ${safeLocation} · ${safeModality}`
    : `${safeLocation} · ${safeModality}`;

  return `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.4;color:#111"> 
    <p>Hola ${safeName},</p>
    <p>Hemos encontrado una oportunidad que coincide con tu perfil:</p>
    <h2 style="margin:6px 0 2px;font-size:18px">${jobTitle}</h2>
    <p style="margin:0 0 8px">${headerLine}</p>
    <p style="margin:18px 0"><a href="${safeUrl}" style="background:#2563EB;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Ver oferta</a></p>
    <p style="color:#666;font-size:13px">Puedes gestionar tus preferencias de notificaciones desde la configuración de tu cuenta.</p>
  </div>
  `;
}
