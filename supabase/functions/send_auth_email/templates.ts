const BRAND_BLUE = '#2563eb';
const TEXT_PRIMARY = '#0f172a';
const TEXT_MUTED = '#64748b';
const BORDER = '#e2e8f0';
const ZARREL_URL = 'https://zarrel.org';
const ZARREL_NAME = 'ZARREL';
const BRAND_SLOGAN = 'Donde las oportunidades te encuentran.';

function escapeHtml(value: string) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function extractFirstName(metadata?: Record<string, unknown> | null): string {
  if (!metadata) return '';

  const direct = String(metadata.first_name ?? metadata.given_name ?? '').trim();
  if (direct) return direct;

  const fullName = String(metadata.full_name ?? metadata.name ?? '').trim();
  if (!fullName) return '';

  return fullName.split(/\s+/)[0] ?? '';
}

export function formatVerificationGreeting(firstName: string): string {
  const name = firstName.trim();
  return name ? `Hola ${name},` : 'Hola,';
}

function buildWordmarkHtml() {
  return `<p style="margin:0;font-size:24px;font-weight:700;letter-spacing:-0.03em;line-height:1.2;">
    <span style="color:${TEXT_PRIMARY};">Traba</span><span style="color:${BRAND_BLUE};">GE</span>
  </p>`;
}

function buildAuthEmailHtml(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT_PRIMARY};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDER};box-shadow:0 4px 24px rgba(15,23,42,0.06);">
          <tr>
            <td style="padding:32px 32px 8px;text-align:center;">
              ${buildWordmarkHtml()}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background:#f8fafc;border-top:1px solid ${BORDER};">
              <p style="margin:0 0 4px;font-size:12px;line-height:1.5;color:${TEXT_MUTED};text-align:center;">&copy; TrabaGE</p>
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${TEXT_MUTED};text-align:center;">${escapeHtml(BRAND_SLOGAN)}</p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:${TEXT_MUTED};text-align:center;">
                Developed by
                <a href="${ZARREL_URL}" target="_blank" rel="noopener noreferrer" style="color:${TEXT_MUTED};text-decoration:underline;">${ZARREL_NAME}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildButton(label: string, href: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 32px;">
    <tr>
      <td style="border-radius:8px;background:${BRAND_BLUE};">
        <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background:${BRAND_BLUE};">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function buildParagraph(text: string, options: { marginBottom?: string; color?: string } = {}) {
  const marginBottom = options.marginBottom ?? '16px';
  const color = options.color ?? TEXT_PRIMARY;
  return `<p style="margin:0 0 ${marginBottom};font-size:16px;line-height:1.65;color:${color};">${escapeHtml(text)}</p>`;
}

function buildDivider() {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0;">
    <tr>
      <td style="border-top:1px solid ${BORDER};font-size:0;line-height:0;">&nbsp;</td>
    </tr>
  </table>`;
}

function buildFallbackLink(verificationUrl: string) {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${TEXT_MUTED};">
    Si no puedes usar el botón, copia y pega este enlace en tu navegador:
  </p>
  <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND_BLUE};word-break:break-all;">
    <a href="${escapeHtml(verificationUrl)}" target="_blank" rel="noopener noreferrer" style="color:${BRAND_BLUE};text-decoration:underline;">${escapeHtml(verificationUrl)}</a>
  </p>`;
}

export interface AuthEmailContent {
  subject: string;
  html: string;
  text: string;
}

export function buildSignupVerificationEmail(
  verificationUrl: string,
  firstName = '',
): AuthEmailContent {
  const subject = 'Verifica tu correo electrónico';
  const greeting = formatVerificationGreeting(firstName);

  const text = [
    greeting,
    '',
    'Gracias por crear tu cuenta en TrabaGE.',
    '',
    'Para activar tu cuenta, verifica tu dirección de correo electrónico haciendo clic en el enlace de abajo.',
    '',
    verificationUrl,
    '',
    '---',
    '',
    'Si no has creado una cuenta en TrabaGE, puedes ignorar este mensaje.',
    '',
    'Gracias,',
    'El equipo de TrabaGE',
  ].join('\n');

  const bodyHtml = [
    buildParagraph(greeting, { marginBottom: '20px' }),
    buildParagraph('Gracias por crear tu cuenta en TrabaGE.'),
    buildParagraph(
      'Para activar tu cuenta, verifica tu dirección de correo electrónico haciendo clic en el botón de abajo.',
      { marginBottom: '0' },
    ),
    buildButton('Verificar mi correo', verificationUrl),
    buildDivider(),
    buildFallbackLink(verificationUrl),
    buildDivider(),
    buildParagraph(
      'Si no has creado una cuenta en TrabaGE, puedes ignorar este mensaje.',
      { color: TEXT_MUTED },
    ),
    buildDivider(),
    buildParagraph('Gracias,', { marginBottom: '4px' }),
    buildParagraph('El equipo de TrabaGE', { marginBottom: '0' }),
  ].join('');

  return {
    subject,
    html: buildAuthEmailHtml(subject, bodyHtml),
    text,
  };
}

export function buildRecoveryEmail(recoveryUrl: string): AuthEmailContent {
  const subject = 'Restablece tu contraseña en TrabaGE';
  const text = [
    'Hola,',
    '',
    'Recibimos una solicitud para restablecer la contraseña de tu cuenta en TrabaGE.',
    recoveryUrl,
    '',
    'Si no solicitaste este cambio, puedes ignorar este correo.',
    '',
    'El equipo de TrabaGE',
  ].join('\n');

  const bodyHtml = [
    buildParagraph('Hola,'),
    buildParagraph('Recibimos una solicitud para restablecer la contraseña de tu cuenta en TrabaGE.'),
    buildButton('Restablecer contraseña', recoveryUrl),
    buildParagraph('Si no solicitaste este cambio, puedes ignorar este correo.'),
    buildParagraph('El equipo de TrabaGE', { marginBottom: '0' }),
  ].join('');

  return {
    subject,
    html: buildAuthEmailHtml(subject, bodyHtml),
    text,
  };
}

export function buildSignupConfirmUrl(
  redirectTo: string,
  tokenHash: string,
) {
  const redirect = redirectTo?.trim() || 'https://trabage.org/auth/confirm';
  const separator = redirect.includes('?') ? '&' : '?';
  return `${redirect}${separator}token_hash=${encodeURIComponent(tokenHash)}&type=email`;
}

export function buildRecoveryConfirmUrl(
  siteUrl: string,
  redirectTo: string,
  tokenHash: string,
) {
  const site = siteUrl?.trim() || 'https://trabage.org';
  const redirect = redirectTo?.trim() || `${site.replace(/\/$/, '')}/auth/callback`;
  const params = new URLSearchParams({
    token: tokenHash,
    type: 'recovery',
    redirect_to: redirect,
  });
  return `${site.replace(/\/$/, '')}/auth/v1/verify?${params.toString()}`;
}
