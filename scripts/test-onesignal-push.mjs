/**
 * Send a test OneSignal push to the logged-in user via send_push edge function.
 *
 * Usage:
 *   npm run test-onesignal-push
 *   TEST_LOGIN_EMAIL=user@example.com TEST_LOGIN_PASSWORD=secret npm run test-onesignal-push
 *
 * Prerequisites:
 * - .env.local with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
 * - OneSignal secrets deployed on send_push edge function
 * - User has granted push permission and has push_subscriptions row
 * - For browser invoke from localhost: send_push CORS allowlist includes localhost:5173
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const TEST_PUSH_TITLE = 'TrabaGE · Prueba de notificación';
const TEST_PUSH_BODY =
  'Esta es una notificación push de prueba. Si puedes verla fuera de TrabaGE, el sistema funciona correctamente.';

function loadEnv() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('No se encontró .env.local');
  }
  const env = fs.readFileSync(envPath, 'utf8');
  return {
    url: env.match(/^\s*VITE_SUPABASE_URL\s*=\s*(.+)\s*$/m)?.[1]?.trim(),
    anonKey: env.match(/^\s*VITE_SUPABASE_ANON_KEY\s*=\s*(.+)\s*$/m)?.[1]?.trim(),
  };
}

function loadCredentials() {
  const email = process.env.TEST_LOGIN_EMAIL?.trim().toLowerCase();
  const password = process.env.TEST_LOGIN_PASSWORD;

  if (email && password) {
    return { email, password, source: 'env' };
  }

  const adminsPath = path.join(__dirname, 'admins.local.json');
  if (!fs.existsSync(adminsPath)) {
    throw new Error(
      'Define TEST_LOGIN_EMAIL/TEST_LOGIN_PASSWORD o crea scripts/admins.local.json',
    );
  }

  const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));
  const first = admins[0];
  if (!first?.email || !first?.password) {
    throw new Error('scripts/admins.local.json debe incluir email y password.');
  }

  return {
    email: first.email.trim().toLowerCase(),
    password: first.password,
    source: 'admins.local.json',
  };
}

async function main() {
  const { url, anonKey } = loadEnv();
  if (!url || !anonKey) {
    throw new Error('VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son obligatorios en .env.local');
  }

  const credentials = loadCredentials();
  const supabase = createClient(url, anonKey);

  console.log('🔐 Login:', credentials.email, `(${credentials.source})`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password.trim(),
  });

  if (authError) {
    console.error('❌ Login fallido:', authError.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log('✅ Sesión OK — user_id:', userId);

  console.log('\n--- Preflight ---');
  console.log('Título:', TEST_PUSH_TITLE);
  console.log('Cuerpo:', TEST_PUSH_BODY);

  const { data: subscriptions, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, onesignal_subscription_id, is_active, platform, updated_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (subsError) {
    console.warn('⚠️  No se pudieron leer push_subscriptions:', subsError.message);
  } else if (!subscriptions?.length) {
    console.warn('⚠️  Sin filas activas en push_subscriptions para este usuario.');
    console.log('   1. Abre http://localhost:5173 (o la PWA) e inicia sesión');
    console.log('   2. Concede permiso de notificaciones del sistema');
    console.log('   3. Confirma fila en push_subscriptions y vuelve a ejecutar');
  } else {
    console.log('📱 Suscripciones activas:', subscriptions.length);
    for (const row of subscriptions) {
      console.log(
        `   - ${row.platform ?? 'web'} · ${String(row.onesignal_subscription_id).slice(0, 8)}… · ${row.updated_at}`,
      );
    }
  }

  const { data: preflight, error: preflightError } = await supabase.rpc('send_test_push_notification', {
    p_title: TEST_PUSH_TITLE,
    p_body: TEST_PUSH_BODY,
  });

  if (preflightError) {
    console.error('❌ RPC send_test_push_notification:', preflightError.message);
    console.log('\nAsegúrate de haber aplicado la migración 090 y de tener push activado en el dispositivo.');
    process.exit(1);
  }

  if (!preflight?.ok) {
    console.warn('⚠️  Preflight RPC no OK — no hay suscripción lista para este usuario.');
    console.log('   Detalle:', preflight?.message ?? preflight);
    process.exit(1);
  }

  console.log('✅ Preflight RPC OK — enviando push real vía send_push…');

  const { data: pushResult, error: pushError } = await supabase.functions.invoke('send_push', {
    body: {
      recipient_id: userId,
      title: TEST_PUSH_TITLE,
      body: TEST_PUSH_BODY,
      data: {
        type: 'system_update',
        link: '/personal/notifications',
        test: true,
      },
    },
  });

  if (pushError) {
    console.error('❌ send_push error:', pushError.message);
    console.log(
      '   Si invocas desde el navegador en localhost y falla CORS, redeploy send_push con allowlist (localhost:5173).',
    );
    process.exit(1);
  }

  if (pushResult?.error) {
    console.error('❌ send_push respuesta:', pushResult.error);
    process.exit(1);
  }

  console.log('✅ Resultado send_push:', JSON.stringify(pushResult, null, 2));

  if (pushResult?.onesignal?.id || pushResult?.id) {
    console.log('✅ OneSignal aceptó el envío (id presente en respuesta).');
  }

  if (pushResult?.sent > 0) {
    console.log('\n🎉 Push enviado a OneSignal.');
    console.log('   Criterio ✅: debes ver el banner del SO (no solo toast/campana in-app).');
    console.log('   Prueba: foreground, background, pestaña cerrada, dispositivo bloqueado si aplica.');
  } else if (pushResult?.skipped > 0) {
    console.log('\n⚠️  Push omitido — revisa preferencias (push_enabled + permiso concedido).');
  } else if (pushResult?.deduped > 0) {
    console.log('\nℹ️  Push deduplicado — espera 10 minutos o cambia el payload.');
  } else {
    console.log('\n⚠️  No se envió ningún push — revisa suscripciones OneSignal y secrets en Supabase.');
  }

  await supabase.auth.signOut();
}

main().catch((error) => {
  console.error('Error fatal:', error.message ?? error);
  process.exit(1);
});
