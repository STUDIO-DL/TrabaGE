import {
  BORDER,
  BRAND_BLUE,
  BRAND_SLOGAN,
  TEXT_MUTED,
  TEXT_PRIMARY,
  ZARREL_NAME,
  ZARREL_URL,
} from './constants.ts';

export function escapeHtml(value: string) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatGreeting(userName?: string | null) {
  const name = userName?.trim();
  if (!name) return 'Hola.';
  return `Hola ${name}.`;
}

function buildParagraphHtml(text: string) {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${TEXT_PRIMARY};">${escapeHtml(text)}</p>`;
}

function buildParagraphsHtml(paragraphs: string[]) {
  return paragraphs.map(buildParagraphHtml).join('');
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

export function buildCtaButtonHtml(label: string, href: string) {
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
    <td style="background:${BRAND_BLUE};padding:28px 32px;">
      <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">TrabaGE</p>
      <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.88);">${escapeHtml(BRAND_SLOGAN)}</p>
    </td>
  </tr>`;
}

function buildFooterHtml() {
  return `<tr>
    <td style="padding:24px 32px;background:#f8fafc;border-top:1px solid ${BORDER};">
      <p style="margin:0 0 4px;font-size:12px;line-height:1.5;color:${TEXT_MUTED};text-align:center;">&copy; TrabaGE</p>
      <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${TEXT_MUTED};text-align:center;">Todos los derechos reservados.</p>
      <p style="margin:0;font-size:11px;line-height:1.5;color:${TEXT_MUTED};text-align:center;">
        Developed by
        <a href="${ZARREL_URL}" target="_blank" rel="noopener noreferrer" style="color:${TEXT_MUTED};text-decoration:underline;">${ZARREL_NAME}</a>
      </p>
    </td>
  </tr>`;
}

export interface WelcomeEmailContent {
  subject: string;
  greeting: string;
  introParagraphs: string[];
  recommendationLead: string;
  bulletItems: string[];
  closingParagraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
}

export function buildWelcomeEmailHtml(content: WelcomeEmailContent) {
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
              ${buildParagraphsHtml([content.greeting, ...content.introParagraphs])}
              <p style="margin:0 0 12px;font-size:16px;line-height:1.65;font-weight:600;color:${TEXT_PRIMARY};">${escapeHtml(content.recommendationLead)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${buildBulletListHtml(content.bulletItems)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              ${buildParagraphsHtml(content.closingParagraphs)}
              ${buildCtaButtonHtml(content.ctaLabel, content.ctaUrl)}
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

export function buildWelcomeEmailText(content: WelcomeEmailContent) {
  const lines = [
    content.greeting,
    '',
    ...content.introParagraphs,
    '',
    content.recommendationLead,
    '',
    ...content.bulletItems.map((item) => `• ${item}`),
    '',
    ...content.closingParagraphs,
    '',
    `${content.ctaLabel}: ${content.ctaUrl}`,
    '',
    '---',
    '© TrabaGE',
    'Todos los derechos reservados.',
    `Developed by ${ZARREL_NAME} — ${ZARREL_URL}`,
  ];

  return lines.join('\n');
}
