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
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

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

  const { data: preflight, error: preflightError } = await supabase.rpc('send_test_push_notification', {
    p_title: 'Prueba TrabaGE',
    p_body: 'Notificación de prueba — cierra la app y revisa la bandeja del sistema.',
  });

  if (preflightError) {
    console.error('❌ RPC send_test_push_notification:', preflightError.message);
    console.log('\nAsegúrate de haber aplicado la migración 090 y de tener push activado en el dispositivo.');
    process.exit(1);
  }

  if (!preflight?.ok) {
    console.warn('⚠️  Sin suscripciones OneSignal registradas para este usuario.');
    console.log('   1. Instala la PWA en Android Chrome');
    console.log('   2. Inicia sesión y activa notificaciones en Ajustes');
    console.log('   3. Vuelve a ejecutar este script');
    console.log('\nDetalle:', preflight?.message ?? preflight);
    process.exit(1);
  }

  console.log('📱 Suscripción OneSignal encontrada — enviando push de prueba...');

  const { data: pushResult, error: pushError } = await supabase.functions.invoke('send_push', {
    body: {
      recipient_id: userId,
      title: 'Prueba TrabaGE',
      body: 'Notificación de prueba — cierra la app y revisa la bandeja del sistema.',
      data: {
        type: 'system_update',
        link: '/personal/notifications',
        test: true,
      },
    },
  });

  if (pushError) {
    console.error('❌ send_push error:', pushError.message);
    process.exit(1);
  }

  if (pushResult?.error) {
    console.error('❌ send_push respuesta:', pushResult.error);
    process.exit(1);
  }

  console.log('✅ Resultado send_push:', JSON.stringify(pushResult, null, 2));

  if (pushResult?.sent > 0) {
    console.log('\n🎉 Push enviado. Cierra la PWA en Android y verifica la bandeja del sistema.');
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
