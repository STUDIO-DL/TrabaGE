import {
  BORDER,
  BRAND_BLUE,
  BRAND_SLOGAN,
  SUPPORT_EMAIL,
  TEXT_MUTED,
  TEXT_PRIMARY,
  buildProfileCtaUrl,
  escapeHtml,
  formatGreeting,
  getAppUrl,
  type ReminderAccountType,
} from './constants.ts';

export const PROFILE_REMINDER_SUBJECT =
  'Tu perfil de TrabaGE puede abrirte más oportunidades';

const BENEFIT_BULLETS = [
  'Mostrar tu experiencia y formación profesional.',
  'Destacar tus habilidades y certificaciones.',
  'Presentar los servicios que ofreces.',
  'Aumentar la confianza y credibilidad de tu perfil.',
  'Tener más posibilidades de aparecer ante empresas y profesionales interesados en tu perfil.',
  'Aprovechar mejor las oportunidades de empleo y networking dentro de TrabaGE.',
];

function buildParagraphHtml(text: string) {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${TEXT_PRIMARY};">${escapeHtml(text)}</p>`;
}

function buildBulletListHtml(items: string[]) {
  return items
    .map(
      (item) =>
        `<tr><td style="padding:0 0 10px 0;font-size:16px;line-height:1.6;color:${TEXT_PRIMARY};">` +
        `<span style="color:${BRAND_BLUE};font-weight:700;padding-right:8px;">&#8226;</span>${escapeHtml(item)}</td></tr>`,
    )
    .join('');
}

function buildCtaButtonHtml(label: string, href: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
    <tr>
      <td style="border-radius:8px;background:${BRAND_BLUE};">
        <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background:${BRAND_BLUE};">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function buildHeaderHtml() {
  return `<tr>
    <td style="background:#ffffff;padding:28px 32px;border-bottom:1px solid ${BORDER};">
      <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.03em;line-height:1.2;">
        <span style="color:${TEXT_PRIMARY};">Traba</span><span style="color:${BRAND_BLUE};">GE</span>
      </p>
      <p style="margin:8px 0 0;font-size:14px;color:${TEXT_MUTED};">${escapeHtml(BRAND_SLOGAN)}</p>
    </td>
  </tr>`;
}

function buildFooterHtml() {
  const appUrl = getAppUrl();
  return `<tr>
    <td style="padding:24px 32px;background:#f8fafc;border-top:1px solid ${BORDER};">
      <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${TEXT_MUTED};text-align:center;">
        ${escapeHtml(BRAND_SLOGAN)}
      </p>
      <p style="margin:0 0 4px;font-size:12px;line-height:1.5;color:${TEXT_MUTED};text-align:center;">
        <a href="mailto:${SUPPORT_EMAIL}" style="color:${TEXT_MUTED};text-decoration:underline;">${SUPPORT_EMAIL}</a>
        &nbsp;·&nbsp;
        <a href="${escapeHtml(appUrl)}" style="color:${TEXT_MUTED};text-decoration:underline;">${escapeHtml(appUrl.replace(/^https?:\/\//, ''))}</a>
      </p>
      <p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:${TEXT_MUTED};text-align:center;">
        &copy; <span style="color:${TEXT_PRIMARY};font-weight:600;">Traba</span><span style="color:${BRAND_BLUE};font-weight:600;">GE</span>
      </p>
    </td>
  </tr>`;
}

export interface ProfileReminderContent {
  subject: string;
  greeting: string;
  percent: number;
  missingSections: string[];
  ctaUrl: string;
  ctaLabel: string;
}

export function buildProfileReminderContent(
  userName: string | null | undefined,
  accountType: ReminderAccountType,
  percent: number,
  missingSections: string[],
): ProfileReminderContent {
  return {
    subject: PROFILE_REMINDER_SUBJECT,
    greeting: formatGreeting(userName),
    percent: Math.max(0, Math.min(100, Math.round(percent || 0))),
    missingSections: (missingSections || []).filter(Boolean).slice(0, 8),
    ctaUrl: buildProfileCtaUrl(accountType),
    ctaLabel: 'Completar mi perfil',
  };
}

export function buildProfileReminderHtml(content: ProfileReminderContent) {
  const missingLead =
    content.missingSections.length > 0
      ? `Tu perfil está al ${content.percent}%. Te recomendamos completar:`
      : `Tu perfil está al ${content.percent}%. Todavía puedes reforzar algunos apartados importantes.`;

  const missingListHtml =
    content.missingSections.length > 0
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;">
          ${buildBulletListHtml(content.missingSections)}
        </table>`
      : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT_PRIMARY};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDER};box-shadow:0 4px 24px rgba(15,23,42,0.06);">
          ${buildHeaderHtml()}
          <tr>
            <td style="padding:32px 32px 8px;">
              ${buildParagraphHtml(content.greeting)}
              ${buildParagraphHtml('Tu perfil de TrabaGE ya es un primer paso, pero todavía puedes sacarle mucho más partido.')}
              ${buildParagraphHtml('Un perfil completo permite que otros profesionales y empresas conozcan mejor quién eres, qué sabes hacer y qué puedes aportar.')}
              <p style="margin:0 0 12px;font-size:16px;line-height:1.65;font-weight:600;color:${TEXT_PRIMARY};">Al completar tu perfil podrás:</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${buildBulletListHtml(BENEFIT_BULLETS)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 8px;">
              ${buildParagraphHtml('Tu perfil todavía tiene algunos apartados pendientes de completar.')}
              ${buildParagraphHtml('No hace falta hacerlo todo de una vez. Empieza por completar las secciones más importantes y poco a poco tendrás un perfil mucho más completo.')}
              <p style="margin:0 0 12px;font-size:16px;line-height:1.65;font-weight:600;color:${TEXT_PRIMARY};">${escapeHtml(missingLead)}</p>
              ${missingListHtml}
              ${buildParagraphHtml('Completa tu perfil y deja que tu experiencia hable por ti.')}
              ${buildCtaButtonHtml(content.ctaLabel, content.ctaUrl)}
              ${buildParagraphHtml('Te esperamos en TrabaGE.')}
              ${buildParagraphHtml('Un saludo,')}
              <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${TEXT_PRIMARY};">Equipo TrabaGE</p>
            </td>
          </tr>
          ${buildFooterHtml()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildProfileReminderText(content: ProfileReminderContent) {
  const missingBlock =
    content.missingSections.length > 0
      ? [
          `Tu perfil está al ${content.percent}%.`,
          '',
          'Te recomendamos completar:',
          ...content.missingSections.map((s) => `• ${s}`),
        ]
      : [`Tu perfil está al ${content.percent}%.`];

  return [
    content.greeting,
    '',
    'Tu perfil de TrabaGE ya es un primer paso, pero todavía puedes sacarle mucho más partido.',
    '',
    'Un perfil completo permite que otros profesionales y empresas conozcan mejor quién eres, qué sabes hacer y qué puedes aportar.',
    '',
    'Al completar tu perfil podrás:',
    ...BENEFIT_BULLETS.map((item) => `• ${item}`),
    '',
    'Tu perfil todavía tiene algunos apartados pendientes de completar.',
    '',
    'No hace falta hacerlo todo de una vez. Empieza por completar las secciones más importantes y poco a poco tendrás un perfil mucho más completo.',
    '',
    ...missingBlock,
    '',
    'Completa tu perfil y deja que tu experiencia hable por ti.',
    '',
    `${content.ctaLabel}: ${content.ctaUrl}`,
    '',
    'Te esperamos en TrabaGE.',
    '',
    'Un saludo,',
    '',
    'Equipo TrabaGE',
    '',
    BRAND_SLOGAN,
    SUPPORT_EMAIL,
    getAppUrl(),
  ].join('\n');
}
