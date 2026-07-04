import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import {
  buildWelcomeEmailHtml,
  buildWelcomeEmailText,
  DEFAULT_FROM_EMAIL,
  EMAIL_SENDER_NAME,
  WELCOME_EMAIL_SUBJECT,
} from './emailTemplate.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('TRABAGE_ALLOWED_ORIGIN') ?? 'https://trabage.org',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-welcome-webhook-secret',
  'Vary': 'Origin',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getFromAddress() {
  return Deno.env.get('SMTP_FROM_EMAIL')?.trim() || DEFAULT_FROM_EMAIL;
}

function isAuthorizedWebhook(req: Request) {
  const expected = Deno.env.get('WELCOME_WEBHOOK_SECRET')?.trim();
  if (!expected) return false;
  return req.headers.get('x-welcome-webhook-secret') === expected;
}

async function sendViaSmtp(to: string, userName: string) {
  const host = Deno.env.get('SMTP_HOST')?.trim();
  const user = Deno.env.get('SMTP_USER')?.trim();
  const pass = Deno.env.get('SMTP_PASS')?.trim();

  if (!host || !user || !pass) {
    throw new Error('SMTP no configurado en la Edge Function');
  }

  const port = Number(Deno.env.get('SMTP_PORT') ?? 587);
  const fromEmail = getFromAddress();
  const fromName = Deno.env.get('SMTP_FROM_NAME')?.trim() || EMAIL_SENDER_NAME;

  const client = new SMTPClient({
    connection: {
      hostname: host,
      port,
      tls: port === 465,
      auth: { username: user, password: pass },
    },
  });

  await client.send({
    from: `${fromName} <${fromEmail}>`,
    to,
    subject: WELCOME_EMAIL_SUBJECT,
    content: buildWelcomeEmailText(userName),
    html: buildWelcomeEmailHtml(userName),
  });

  await client.close();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Supabase no configurado' }, 500);
    }

    const payload = await req.json();
    const webhookRecord = payload?.record ?? payload;
    const userId = String(webhookRecord?.user_id ?? payload?.user_id ?? '').trim();

    if (!userId) {
      return jsonResponse({ error: 'user_id requerido' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const isWebhook = isAuthorizedWebhook(req);

    if (!isWebhook) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !anonKey) {
        return jsonResponse({ error: 'No autorizado' }, 401);
      }

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: authData, error: authError } = await userClient.auth.getUser();
      if (authError || authData.user?.id !== userId) {
        return jsonResponse({ error: 'No autorizado' }, 403);
      }
    }

    const { data: claimed, error: claimError } = await admin.rpc('claim_welcome_email_send', {
      p_user_id: userId,
    });

    if (claimError) {
      console.error('[send_welcome_email] claim error:', claimError.message);
      return jsonResponse({ error: 'No se pudo reservar el envío' }, 500);
    }

    if (!claimed) {
      return jsonResponse({ ok: true, skipped: true, reason: 'already_sent' });
    }

    let email = String(webhookRecord?.email ?? '').trim();
    let userName = String(webhookRecord?.user_name ?? '').trim();

    if (!email) {
      const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
      if (userError || !userData.user?.email) {
        await admin.rpc('release_welcome_email_claim', { p_user_id: userId });
        return jsonResponse({ error: 'Usuario no encontrado' }, 404);
      }

      email = userData.user.email;
      userName =
        userName ||
        String(userData.user.user_metadata?.full_name ?? userData.user.user_metadata?.name ?? '').trim() ||
        email.split('@')[0];
    }

    try {
      await sendViaSmtp(email, userName);
    } catch (smtpError) {
      await admin.rpc('release_welcome_email_claim', { p_user_id: userId });
      console.error('[send_welcome_email] SMTP error:', smtpError);
      return jsonResponse({ error: 'No se pudo enviar el correo de bienvenida' }, 502);
    }

    await admin.from('welcome_email_outbox').delete().eq('user_id', userId);

    return jsonResponse({ ok: true, sent: true, user_id: userId });
  } catch (error) {
    console.error('[send_welcome_email] unexpected:', error);
    return jsonResponse({ error: 'Error interno' }, 500);
  }
});
