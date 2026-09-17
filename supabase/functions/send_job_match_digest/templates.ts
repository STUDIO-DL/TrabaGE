type DigestJob = {
  id: string;
  title: string;
  city?: string | null;
  country?: string | null;
  work_mode?: string | null;
  company_name?: string | null;
  publisher_name?: string | null;
  source_type?: string | null;
  score?: number | null;
};

export function buildDigestSubject(frequency: 'daily' | 'weekly', count: number) {
  const label = frequency === 'weekly' ? 'semanal' : 'diario';
  return `Tu resumen ${label} de oportunidades en TrabaGE (${count})`;
}

export function buildDigestText({
  name,
  frequency,
  jobs,
  baseUrl,
}: {
  name: string;
  frequency: 'daily' | 'weekly';
  jobs: DigestJob[];
  baseUrl: string;
}) {
  const label = frequency === 'weekly' ? 'esta semana' : 'hoy';
  const lines = jobs.map((job) => {
    const location = [job.city, job.country].filter(Boolean).join(', ');
    const subtitle = job.source_type === 'user' && job.publisher_name
      ? `publicada por ${job.publisher_name}`
      : job.company_name || '';
    return `- ${job.title}${subtitle ? ` (${subtitle})` : ''}${location ? ` — ${location}` : ''}\n  ${baseUrl}/personal/jobs/${job.id}`;
  });

  return `Hola ${name || ''},\n\nEstas oportunidades coinciden con tu perfil ${label}:\n\n${lines.join('\n\n')}\n\nPuedes gestionar tus preferencias desde la configuración de tu cuenta en TrabaGE.`;
}

export function buildDigestHtml({
  name,
  frequency,
  jobs,
  baseUrl,
}: {
  name: string;
  frequency: 'daily' | 'weekly';
  jobs: DigestJob[];
  baseUrl: string;
}) {
  const label = frequency === 'weekly' ? 'esta semana' : 'hoy';
  const items = jobs.map((job) => {
    const location = [job.city, job.country].filter(Boolean).join(', ');
    const subtitle = job.source_type === 'user' && job.publisher_name
      ? `publicada por <strong>${job.publisher_name}</strong>`
      : job.company_name
        ? `<strong>${job.company_name}</strong>`
        : '';
    const url = `${baseUrl}/personal/jobs/${job.id}`;

    return `
      <li style="margin:0 0 14px">
        <a href="${url}" style="color:#2563EB;text-decoration:none;font-weight:600">${job.title}</a>
        ${subtitle ? `<div style="color:#444;margin-top:2px">${subtitle}</div>` : ''}
        ${location ? `<div style="color:#666;font-size:13px;margin-top:2px">${location}${job.work_mode ? ` · ${job.work_mode}` : ''}</div>` : ''}
      </li>`;
  }).join('');

  return `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.4;color:#111">
    <p>Hola ${name || ''},</p>
    <p>Estas oportunidades coinciden con tu perfil ${label}:</p>
    <ul style="padding-left:18px;margin:12px 0 18px">${items}</ul>
    <p style="color:#666;font-size:13px">Puedes gestionar tus preferencias de notificaciones desde la configuración de tu cuenta.</p>
  </div>`;
}
