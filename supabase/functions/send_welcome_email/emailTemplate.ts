/**
 * TrabaGE transactional welcome email.
 * Sender address is configured via SMTP_FROM_EMAIL (default: noreply.trabage@gmail.com).
 */
export const EMAIL_SENDER_NAME = 'TrabaGE';

export const DEFAULT_FROM_EMAIL = 'noreply.trabage@gmail.com';

export const WELCOME_EMAIL_SUBJECT = '¡Bienvenido a TrabaGE! 🚀';

const BRAND_BLUE = '#2563eb';
const BRAND_BLUE_DARK = '#1d4ed8';
const TEXT_PRIMARY = '#0f172a';
const TEXT_MUTED = '#64748b';
const BORDER = '#e2e8f0';
const APP_URL = 'https://trabage.org';

const BULLET_ITEMS = [
  'Crear y completar tu perfil.',
  'Descubrir nuevas oportunidades laborales.',
  'Conectar con empresas e instituciones.',
  'Compartir publicaciones profesionales.',
  'Hacer crecer tu red de contactos.',
  'Impulsar tu desarrollo profesional.',
];

function escapeHtml(value: string) {
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

function buildBulletListHtml() {
  return BULLET_ITEMS.map(
    (item) =>
      `<tr><td style="padding:0 0 10px 0;font-size:16px;line-height:1.6;color:${TEXT_PRIMARY};">` +
      `<span style="color:${BRAND_BLUE};font-weight:700;padding-right:8px;">&#8226;</span>${item}</td></tr>`,
  ).join('');
}

function buildBulletListText() {
  return BULLET_ITEMS.map((item) => `• ${item}`).join('\n');
}

export function buildWelcomeEmailHtml(userName?: string | null) {
  const greeting = escapeHtml(formatGreeting(userName));

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${WELCOME_EMAIL_SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT_PRIMARY};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDER};box-shadow:0 4px 24px rgba(15,23,42,0.06);">
          <tr>
            <td style="background:${BRAND_BLUE};padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">TrabaGE</p>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.88);">Conectando talento, empresas e instituciones</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0 0 20px;font-size:26px;line-height:1.3;font-weight:700;color:${TEXT_PRIMARY};letter-spacing:-0.02em;">¡Te damos la bienvenida!</h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${TEXT_PRIMARY};">${greeting}</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${TEXT_PRIMARY};">¡Te damos la bienvenida a TrabaGE!</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${TEXT_PRIMARY};">Nos alegra enormemente que formes parte de nuestra comunidad.</p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:${TEXT_PRIMARY};">TrabaGE es una plataforma diseñada para conectar talento, empresas e instituciones de forma sencilla, profesional y segura.</p>
              <p style="margin:0 0 12px;font-size:16px;line-height:1.65;font-weight:600;color:${TEXT_PRIMARY};">A partir de ahora podrás:</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${buildBulletListHtml()}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${TEXT_PRIMARY};">Esperamos que TrabaGE se convierta en una herramienta clave para alcanzar tus objetivos.</p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:${TEXT_PRIMARY};">Si tienes cualquier duda o necesitas ayuda, estaremos encantados de ayudarte.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:8px;background:${BRAND_BLUE};">
                    <a href="${APP_URL}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background:${BRAND_BLUE};">Ir a TrabaGE</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:16px;line-height:1.65;color:${TEXT_PRIMARY};">¡Bienvenido a la comunidad!</p>
              <p style="margin:0;font-size:16px;line-height:1.65;font-weight:600;color:${TEXT_PRIMARY};">El equipo de TrabaGE.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background:#f8fafc;border-top:1px solid ${BORDER};">
              <p style="margin:0 0 4px;font-size:12px;line-height:1.5;color:${TEXT_MUTED};text-align:center;">&copy; TrabaGE</p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:${TEXT_MUTED};text-align:center;">Todos los derechos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildWelcomeEmailText(userName?: string | null) {
  const greeting = formatGreeting(userName);

  return `${greeting}

¡Te damos la bienvenida a TrabaGE!

Nos alegra enormemente que formes parte de nuestra comunidad.

TrabaGE es una plataforma diseñada para conectar talento, empresas e instituciones de forma sencilla, profesional y segura.

A partir de ahora podrás:

${buildBulletListText()}

Esperamos que TrabaGE se convierta en una herramienta clave para alcanzar tus objetivos.

Si tienes cualquier duda o necesitas ayuda, estaremos encantados de ayudarte.

¡Bienvenido a la comunidad!

El equipo de TrabaGE.

---
© TrabaGE
Todos los derechos reservados.`;
}
