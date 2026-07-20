/**
 * End-to-end verification: in-app + push notification delivery for the logged-in user.
 *
 * Usage:
 *   npm run test-notification-delivery
 *   TEST_LOGIN_EMAIL=user@example.com TEST_LOGIN_PASSWORD=secret npm run test-notification-delivery
 *
 * Prerequisites:
 * - Migration 091 applied (supabase db push)
 * - .env.local with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
 * - User has activated notifications (push_enabled + permission granted)
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
  const testTitle = `Prueba E2E ${new Date().toISOString()}`;
  const testBody = 'Verificación in-app + push — TrabaGE';
  const testType = 'system_update';
  const testMetadata = {
    link: '/personal/notifications',
    test: true,
  };

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

  const { data: preferences, error: prefsError } = await supabase
    .from('notification_preferences')
    .select('push_enabled, permission_status, system_updates')
    .eq('user_id', userId)
    .maybeSingle();

  if (prefsError) {
    console.error('❌ No se pudieron leer preferencias:', prefsError.message);
    process.exit(1);
  }

  const { count: subscriptionCount, error: subError } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);

  if (subError) {
    console.warn('⚠️  No se pudieron leer suscripciones push:', subError.message);
  }

  const preferencesReady =
    preferences?.push_enabled === true &&
    preferences?.permission_status === 'granted' &&
    preferences?.system_updates !== false;

  console.log('\n📋 Estado de preferencias:');
  console.log('   push_enabled:', preferences?.push_enabled ?? false);
  console.log('   permission_status:', preferences?.permission_status ?? 'unknown');
  console.log('   system_updates:', preferences?.system_updates ?? false);
  console.log('   suscripciones activas:', subscriptionCount ?? 0);
  console.log('   listo para E2E:', preferencesReady ? '✅' : '❌');

  if (!preferencesReady) {
    console.log('\n⚠️  Activa notificaciones en la app antes de ejecutar este test.');
    console.log('   Ajustes → Notificaciones → Recibir notificaciones → ON');
  }

  console.log('\n📥 Paso 1: crear notificación in-app (create_notification)...');
  const { data: inAppRow, error: createError } = await supabase.rpc('create_notification', {
    p_recipient_id: userId,
    p_type: testType,
    p_title: testTitle,
    p_body: testBody,
    p_metadata: testMetadata,
  });

  if (createError) {
    console.error('❌ create_notification:', createError.message);
    process.exit(1);
  }

  if (!inAppRow) {
    console.log('⚠️  In-app omitida — las preferencias del usuario bloquean esta notificación.');
    process.exit(1);
  }

  console.log('✅ In-app creada — id:', inAppRow.id);

  console.log('\n📤 Paso 2: enviar push (send_push)...');
  const { data: pushResult, error: pushError } = await supabase.functions.invoke('send_push', {
    body: {
      recipient_id: userId,
      title: testTitle,
      body: testBody,
      data: {
        type: testType,
        ...testMetadata,
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

  const inAppOk = Boolean(inAppRow?.id);
  const pushOk = (pushResult?.sent ?? 0) > 0;

  console.log('\n📊 Resumen E2E:');
  console.log('   In-app:', inAppOk ? '✅' : '❌');
  console.log('   Push:  ', pushOk ? '✅' : '❌');

  if (inAppOk && pushOk) {
    console.log('\n🎉 Entrega dual confirmada. Revisa la bandeja in-app y la notificación del sistema.');
  } else if (inAppOk && !pushOk) {
    console.log('\n⚠️  Solo in-app OK. Revisa permisos push, suscripciones OneSignal o secrets de send_push.');
  } else {
    console.log('\n❌ Entrega incompleta.');
    process.exit(1);
  }

  if (process.env.TEST_MESSAGE_PUSH === '1') {
    console.log('\n📨 Paso 3 (opcional): verificar push de mensaje (new_message)...');

    const { data: messageNotification, error: messageLookupError } = await supabase
      .from('notifications')
      .select('title, body, metadata')
      .eq('recipient_id', userId)
      .eq('type', 'new_message')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (messageLookupError) {
      console.error('❌ No se pudo buscar notificación new_message:', messageLookupError.message);
      process.exit(1);
    }

    if (!messageNotification) {
      console.log('⚠️  No hay notificaciones new_message recientes. Envía un mensaje desde otra cuenta primero.');
    } else {
      const metadata = messageNotification.metadata ?? {};
      const { data: messagePushResult, error: messagePushError } = await supabase.functions.invoke('send_push', {
        body: {
          recipient_id: userId,
          title: messageNotification.title,
          body: messageNotification.body ?? '',
          data: {
            type: 'new_message',
            link: metadata.link ?? '',
            conversation_id: metadata.conversation_id ?? '',
            message_id: metadata.message_id ?? '',
          },
        },
      });

      if (messagePushError) {
        console.error('❌ send_push (new_message) error:', messagePushError.message);
        process.exit(1);
      }

      if (messagePushResult?.error) {
        console.error('❌ send_push (new_message) respuesta:', messagePushResult.error);
        process.exit(1);
      }

      console.log('✅ Resultado send_push (new_message):', JSON.stringify(messagePushResult, null, 2));
    }
  }

  await supabase.auth.signOut();
}

main().catch((error) => {
  console.error('Error fatal:', error.message ?? error);
  process.exit(1);
});
