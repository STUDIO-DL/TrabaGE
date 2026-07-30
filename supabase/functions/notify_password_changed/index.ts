import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { deliverAuthEmailDetailed, formatResendError } from '../_shared/authEmailDelivery.ts';
import { buildPasswordChangedEmail } from '../send_auth_email/templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('TRABAGE_ALLOWED_ORIGIN') ?? 'https://trabage.org',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  Vary: 'Origin',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getEnv(name: string) {
  return Deno.env.get(name)?.trim() || '';
}

async function logPasswordChangedEmail(
  admin: ReturnType<typeof createClient>,
  userId: string,
  status: 'sent' | 'failed',
  details?: { email?: string; error?: string; messageId?: string | null },
) {
  try {
    const { error } = await admin.from('password_changed_email_logs').insert({
      user_id: userId,
      status,
      email: details?.email ?? null,
      error_message: details?.error ?? null,
      provider_message_id: details?.messageId ?? null,
    });
    if (error) {
      console.error(
        '[notify_password_changed] log insert failed:',
        formatResendError(error),
      );
    }
  } catch (logError) {
    console.error('[notify_password_changed] log insert failed:', formatResendError(logError));
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false }, 405);
  }

  const supabaseUrl = getEnv('SUPABASE_URL');
  const anonKey = getEnv('SUPABASE_ANON_KEY');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const authHeader = req.headers.get('Authorization') ?? '';

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('[notify_password_changed] missing Supabase env');
    return jsonResponse({ ok: false }, 200);
  }

  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse({ ok: false }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user?.id || !user.email) {
    console.error(
      '[notify_password_changed] unauthorized or missing email:',
      formatResendError(userError),
    );
    return jsonResponse({ ok: false }, 401);
  }

  const emailContent = buildPasswordChangedEmail();

  try {
    const delivery = await deliverAuthEmailDetailed({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    await logPasswordChangedEmail(admin, user.id, 'sent', {
      email: user.email,
      messageId: delivery.messageId,
    });
    console.log(
      '[notify_password_changed] sent:',
      user.email,
      `via ${delivery.provider}`,
      delivery.messageId ? `id=${delivery.messageId}` : '',
    );
    return jsonResponse({ ok: true });
  } catch (error) {
    const message = formatResendError(error);
    console.error('[notify_password_changed] send failed:', message);
    await logPasswordChangedEmail(admin, user.id, 'failed', {
      email: user.email,
      error: message,
    });
    return jsonResponse({ ok: false }, 200);
  }
});
