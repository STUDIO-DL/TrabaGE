export function buildJobMatchSubject(jobTitle: string) {
  return `Nueva oportunidad para ti en TrabaGE — ${String(jobTitle ?? '').slice(0, 80)}`;
}

export function buildJobMatchText({ name, jobTitle, company, location, modality, url }: {
  name: string;
  jobTitle: string;
  company: string;
  location: string;
  modality: string;
  url: string;
}) {
  return `Hola ${name || ''},\n\nHemos encontrado una oportunidad que coincide con tu perfil.\n\n${jobTitle}\n${company || ''}\n${location || ''}\n${modality || ''}\n\nVer oferta: ${url}\n\nPuedes gestionar tus preferencias desde la configuración de tu cuenta en TrabaGE.`;
}

export function buildJobMatchHtml({ name, jobTitle, company, location, modality, url }: {
  name: string;
  jobTitle: string;
  company: string;
  location: string;
  modality: string;
  url: string;
}) {
  const safeName = name || '';
  const safeCompany = company || '';
  const safeLocation = location || '';
  const safeModality = modality || '';
  const safeUrl = url || '#';

  return `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.4;color:#111"> 
    <p>Hola ${safeName},</p>
    <p>Hemos encontrado una oportunidad que coincide con tu perfil:</p>
    <h2 style="margin:6px 0 2px;font-size:18px">${jobTitle}</h2>
    <p style="margin:0 0 8px"><strong>${safeCompany}</strong> — ${safeLocation} · ${safeModality}</p>
    <p style="margin:18px 0"><a href="${safeUrl}" style="background:#2563EB;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Ver oferta</a></p>
    <p style="color:#666;font-size:13px">Puedes gestionar tus preferencias de notificaciones desde la configuración de tu cuenta.</p>
  </div>
  `;
}
