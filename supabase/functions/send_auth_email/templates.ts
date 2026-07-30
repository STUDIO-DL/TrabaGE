const BRAND_BLUE = '#2563eb';
const TEXT_PRIMARY = '#0f172a';
const TEXT_MUTED = '#64748b';
const BORDER = '#e2e8f0';
const ZARREL_URL = 'https://zarrel.org';
const ZARREL_NAME = 'ZARREL TECH';
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
              <p style="margin:0 0 4px;font-size:12px;line-height:1.5;color:${TEXT_MUTED};text-align:center;">
                &copy; <span style="color:${TEXT_PRIMARY};font-weight:600;">Traba</span><span style="color:${BRAND_BLUE};font-weight:600;">GE</span>
              </p>
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${TEXT_MUTED};text-align:center;">${escapeHtml(BRAND_SLOGAN)}</p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:${TEXT_MUTED};text-align:center;">
                Desarrollado por
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

export function buildPasswordChangedEmail(): AuthEmailContent {
  const subject = 'Tu contraseña de TrabaGE ha sido actualizada';
  const supportEmail = 'support@trabage.org';
  const appUrl = 'https://trabage.org';

  const text = [
    'Hola,',
    '',
    'Te confirmamos que la contraseña de tu cuenta de TrabaGE se ha actualizado correctamente.',
    '',
    'Te recomendamos mantener tu contraseña segura y no compartirla con nadie. TrabaGE nunca te pedirá que compartas tu contraseña por correo, mensaje o cualquier otro medio.',
    '',
    'Si tú realizaste este cambio, no necesitas hacer nada más.',
    '',
    'Si no reconoces este cambio, te recomendamos proteger tu cuenta inmediatamente y ponerte en contacto con el equipo de soporte de TrabaGE.',
    '',
    'Un saludo,',
    '',
    'Equipo TrabaGE',
    '',
    'TrabaGE',
    BRAND_SLOGAN,
    '',
    supportEmail,
    appUrl,
  ].join('\n');

  const bodyHtml = [
    buildParagraph('Hola,'),
    buildParagraph(
      'Te confirmamos que la contraseña de tu cuenta de TrabaGE se ha actualizado correctamente.',
    ),
    buildParagraph(
      'Te recomendamos mantener tu contraseña segura y no compartirla con nadie. TrabaGE nunca te pedirá que compartas tu contraseña por correo, mensaje o cualquier otro medio.',
    ),
    buildParagraph('Si tú realizaste este cambio, no necesitas hacer nada más.'),
    buildParagraph(
      'Si no reconoces este cambio, te recomendamos proteger tu cuenta inmediatamente y ponerte en contacto con el equipo de soporte de TrabaGE.',
    ),
    buildDivider(),
    buildParagraph('Un saludo,', { marginBottom: '4px' }),
    buildParagraph('Equipo TrabaGE', { marginBottom: '8px' }),
    buildParagraph('TrabaGE', { marginBottom: '4px' }),
    buildParagraph(BRAND_SLOGAN, { marginBottom: '8px' }),
    `<p style="margin:0;font-size:16px;line-height:1.65;color:${TEXT_MUTED};"><a href="mailto:${supportEmail}" style="color:${BRAND_BLUE};text-decoration:underline;">${escapeHtml(supportEmail)}</a></p>`,
    `<p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:${TEXT_MUTED};"><a href="${appUrl}" style="color:${BRAND_BLUE};text-decoration:underline;">${appUrl.replace(/^https?:\/\//, '')}</a></p>`,
  ].join('');

  return {
    subject,
    html: buildAuthEmailHtml(subject, bodyHtml),
    text,
  };
}

export function buildOrganizationGoodbyeEmail(): AuthEmailContent {
  const subject = 'Su cuenta de TrabaGE ha sido eliminada';
  const supportEmail = 'support@trabage.org';

  const text = [
    'Hola,',
    '',
    'Hemos recibido su solicitud y confirmamos que la cuenta de su organización en TrabaGE ha sido eliminada correctamente.',
    '',
    'Agradecemos sinceramente que hayan formado parte de nuestra plataforma y que hayan confiado en TrabaGE para conectar con profesionales, dar visibilidad a su organización y compartir sus oportunidades y servicios.',
    '',
    'Lamentamos verles marchar y esperamos que, en algún momento, TrabaGE pueda volver a ser útil para su organización.',
    '',
    'Les deseamos muchos éxitos en sus próximos proyectos y actividades.',
    '',
    'Gracias por haber formado parte de la comunidad TrabaGE.',
    '',
    'Un cordial saludo,',
    '',
    'Equipo TrabaGE',
    '',
    'TrabaGE',
    BRAND_SLOGAN,
    '',
    supportEmail,
  ].join('\n');

  const bodyHtml = [
    buildParagraph('Hola,'),
    buildParagraph(
      'Hemos recibido su solicitud y confirmamos que la cuenta de su organización en TrabaGE ha sido eliminada correctamente.',
    ),
    buildParagraph(
      'Agradecemos sinceramente que hayan formado parte de nuestra plataforma y que hayan confiado en TrabaGE para conectar con profesionales, dar visibilidad a su organización y compartir sus oportunidades y servicios.',
    ),
    buildParagraph(
      'Lamentamos verles marchar y esperamos que, en algún momento, TrabaGE pueda volver a ser útil para su organización.',
    ),
    buildParagraph(
      'Les deseamos muchos éxitos en sus próximos proyectos y actividades.',
    ),
    buildParagraph('Gracias por haber formado parte de la comunidad TrabaGE.'),
    buildDivider(),
    buildParagraph('Un cordial saludo,', { marginBottom: '4px' }),
    buildParagraph('Equipo TrabaGE', { marginBottom: '12px' }),
    buildParagraph('TrabaGE', { marginBottom: '4px' }),
    buildParagraph(BRAND_SLOGAN, { marginBottom: '12px', color: TEXT_MUTED }),
    `<p style="margin:0;font-size:16px;line-height:1.65;color:${TEXT_MUTED};"><a href="mailto:${supportEmail}" style="color:${BRAND_BLUE};text-decoration:underline;">${escapeHtml(supportEmail)}</a></p>`,
  ].join('');

  return {
    subject,
    html: buildAuthEmailHtml(subject, bodyHtml),
    text,
  };
}

export function buildBusinessGoodbyeEmail(): AuthEmailContent {
  const subject = 'Su cuenta de TrabaGE ha sido eliminada';
  const supportEmail = 'support@trabage.org';

  const text = [
    'Hola,',
    '',
    'Hemos recibido su solicitud y confirmamos que la cuenta de su empresa en TrabaGE ha sido eliminada correctamente.',
    '',
    'Agradecemos que hayan confiado en TrabaGE para publicar ofertas, conectar con talento y dar visibilidad a su empresa.',
    '',
    'Lamentamos verles marchar. Si en el futuro vuelven a necesitar una plataforma para contratar, estaremos aquí.',
    '',
    'Les deseamos mucho éxito en sus próximos proyectos.',
    '',
    'Gracias por haber formado parte de la comunidad TrabaGE.',
    '',
    'Un cordial saludo,',
    '',
    'Equipo TrabaGE',
    '',
    'TrabaGE',
    BRAND_SLOGAN,
    '',
    supportEmail,
  ].join('\n');

  const bodyHtml = [
    buildParagraph('Hola,'),
    buildParagraph(
      'Hemos recibido su solicitud y confirmamos que la cuenta de su empresa en TrabaGE ha sido eliminada correctamente.',
    ),
    buildParagraph(
      'Agradecemos que hayan confiado en TrabaGE para publicar ofertas, conectar con talento y dar visibilidad a su empresa.',
    ),
    buildParagraph(
      'Lamentamos verles marchar. Si en el futuro vuelven a necesitar una plataforma para contratar, estaremos aquí.',
    ),
    buildParagraph('Les deseamos mucho éxito en sus próximos proyectos.'),
    buildParagraph('Gracias por haber formado parte de la comunidad TrabaGE.'),
    buildDivider(),
    buildParagraph('Un cordial saludo,', { marginBottom: '4px' }),
    buildParagraph('Equipo TrabaGE', { marginBottom: '12px' }),
    buildParagraph('TrabaGE', { marginBottom: '4px' }),
    buildParagraph(BRAND_SLOGAN, { marginBottom: '12px', color: TEXT_MUTED }),
    `<p style="margin:0;font-size:16px;line-height:1.65;color:${TEXT_MUTED};"><a href="mailto:${supportEmail}" style="color:${BRAND_BLUE};text-decoration:underline;">${escapeHtml(supportEmail)}</a></p>`,
  ].join('');

  return {
    subject,
    html: buildAuthEmailHtml(subject, bodyHtml),
    text,
  };
}

/** Farewell email for personal (candidate) account deletion. */
export function buildPersonalGoodbyeEmail(): AuthEmailContent {
  const subject = 'Tu cuenta de TrabaGE ha sido eliminada';
  const supportEmail = 'support@trabage.org';

  const text = [
    'Hola,',
    '',
    'Hemos recibido tu solicitud y confirmamos que tu cuenta de TrabaGE ha sido eliminada correctamente.',
    '',
    'Gracias por haber formado parte de nuestra comunidad. Ha sido un placer acompañarte en la búsqueda de oportunidades profesionales.',
    '',
    'Lamentamos verte marchar. Si en el futuro decides volver, te recibiremos con los brazos abiertos.',
    '',
    'Te deseamos mucho éxito en tu camino profesional.',
    '',
    'Un cordial saludo,',
    '',
    'Equipo TrabaGE',
    '',
    'TrabaGE',
    BRAND_SLOGAN,
    '',
    supportEmail,
  ].join('\n');

  const bodyHtml = [
    buildParagraph('Hola,'),
    buildParagraph(
      'Hemos recibido tu solicitud y confirmamos que tu cuenta de TrabaGE ha sido eliminada correctamente.',
    ),
    buildParagraph(
      'Gracias por haber formado parte de nuestra comunidad. Ha sido un placer acompañarte en la búsqueda de oportunidades profesionales.',
    ),
    buildParagraph(
      'Lamentamos verte marchar. Si en el futuro decides volver, te recibiremos con los brazos abiertos.',
    ),
    buildParagraph('Te deseamos mucho éxito en tu camino profesional.'),
    buildDivider(),
    buildParagraph('Un cordial saludo,', { marginBottom: '4px' }),
    buildParagraph('Equipo TrabaGE', { marginBottom: '12px' }),
    buildParagraph('TrabaGE', { marginBottom: '4px' }),
    buildParagraph(BRAND_SLOGAN, { marginBottom: '12px', color: TEXT_MUTED }),
    `<p style="margin:0;font-size:16px;line-height:1.65;color:${TEXT_MUTED};"><a href="mailto:${supportEmail}" style="color:${BRAND_BLUE};text-decoration:underline;">${escapeHtml(supportEmail)}</a></p>`,
  ].join('');

  return {
    subject,
    html: buildAuthEmailHtml(subject, bodyHtml),
    text,
  };
}

export function buildGoodbyeEmail(accountType: string): AuthEmailContent {
  if (accountType === 'organization') return buildOrganizationGoodbyeEmail();
  if (accountType === 'business' || accountType === 'company') return buildBusinessGoodbyeEmail();
  return buildPersonalGoodbyeEmail();
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
  // GoTrue verify must hit the Supabase API host (/auth/v1/verify), never the SPA.
  // Prefer SUPABASE_URL (always set in Edge Functions). Fall back to site_url only
  // when it already looks like a *.supabase.co API host.
  const envApi =
    typeof Deno !== 'undefined' ? (Deno.env.get('SUPABASE_URL')?.trim() || '') : '';
  const rawSite = siteUrl?.trim() || '';
  const authBase = (
    envApi ||
    (rawSite.includes('.supabase.co') ? rawSite : '')
  ).replace(/\/$/, '');

  if (!authBase) {
    throw new Error('SUPABASE_URL no configurado para enlaces de recuperación');
  }

  // App redirect always lands on TrabaGE (not zarrel.org).
  const redirect = redirectTo?.trim() || 'https://trabage.org/auth/callback';
  const params = new URLSearchParams({
    token: tokenHash,
    type: 'recovery',
    redirect_to: redirect,
  });
  return `${authBase}/auth/v1/verify?${params.toString()}`;
}
