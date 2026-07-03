/**
 * TrabaGE transactional email sender config.
 * Change SMTP_FROM_EMAIL to noreply@trabage.org in production without code changes.
 */
export const EMAIL_SENDER_NAME = 'TrabaGE';

export const DEFAULT_FROM_EMAIL = 'noreply.trabage@gmail.com';

export const WELCOME_EMAIL_SUBJECT = 'Bienvenido a TrabaGE 🎉';

export function buildWelcomeEmailHtml(userName) {
  const name = userName?.trim() || 'Usuario';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${WELCOME_EMAIL_SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px 28px;border:1px solid #e2e8f0;">
          <tr>
            <td>
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#2563eb;letter-spacing:0.02em;">TrabaGE</p>
              <h1 style="margin:0 0 20px;font-size:24px;line-height:1.25;">Bienvenido a TrabaGE 🎉</h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola ${escapeHtml(name)},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">¡Bienvenido a TrabaGE!</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
                Nos alegra que te unas a nuestra comunidad que conecta profesionales, empresas e instituciones.
              </p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Tu cuenta ya está lista.</p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">
                Completa tu perfil para aumentar tu visibilidad y descubrir oportunidades acordes a tus habilidades.
              </p>
              <p style="margin:0 0 8px;font-size:16px;line-height:1.6;">Gracias por unirte a nosotros.</p>
              <p style="margin:0;font-size:16px;line-height:1.6;font-weight:600;">El equipo de TrabaGE</p>
              <hr style="margin:28px 0;border:none;border-top:1px solid #e2e8f0;" />
              <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">
                Este correo fue enviado automáticamente por TrabaGE.
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

export function buildWelcomeEmailText(userName) {
  const name = userName?.trim() || 'Usuario';

  return `Hola ${name},

¡Bienvenido a TrabaGE!

Nos alegra que te unas a nuestra comunidad que conecta profesionales, empresas e instituciones.

Tu cuenta ya está lista.

Completa tu perfil para aumentar tu visibilidad y descubrir oportunidades acordes a tus habilidades.

Gracias por unirte a nosotros.

El equipo de TrabaGE

---
Este correo fue enviado automáticamente por TrabaGE.`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
