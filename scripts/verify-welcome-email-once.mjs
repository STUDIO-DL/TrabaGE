/**
 * Verifies welcome email RPC is idempotent and safe after repeated login.
 * Usage: npm run verify-welcome-email-once
 *
 * Requires .env.local with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
 * and TEST_LOGIN_EMAIL / TEST_LOGIN_PASSWORD (or scripts/admins.local.json).
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
    serviceKey: env.match(/^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)\s*$/m)?.[1]?.trim(),
  };
}

function loadCredentials() {
  const email = process.env.TEST_LOGIN_EMAIL?.trim().toLowerCase();
  const password = process.env.TEST_LOGIN_PASSWORD;

  if (email && password) {
    return { email, password };
  }

  const adminsPath = path.join(__dirname, 'admins.local.json');
  if (!fs.existsSync(adminsPath)) {
    throw new Error('Define TEST_LOGIN_EMAIL/TEST_LOGIN_PASSWORD o scripts/admins.local.json');
  }

  const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));
  const entry = admins[0];
  return { email: entry.email.trim().toLowerCase(), password: entry.password };
}

async function callWelcomeRpc(supabase) {
  const { data, error } = await supabase.rpc('request_welcome_email_if_needed');
  if (error) throw error;
  return data === true;
}

async function fetchOutboxCount(admin, userId) {
  if (!admin) return null;
  const { count, error } = await admin
    .from('welcome_email_outbox')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return count ?? 0;
}

async function fetchSentExists(admin, userId) {
  if (!admin) return null;
  const { count, error } = await admin
    .from('welcome_emails_sent')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

async function main() {
  const { url, anonKey, serviceKey } = loadEnv();
  if (!url || !anonKey) throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');

  const { email, password } = loadCredentials();
  const supabase = createClient(url, anonKey);
  const admin = serviceKey ? createClient(url, serviceKey) : null;

  console.log('Verificando welcome email para:', email);

  const loginOnce = async (label) => {
    await supabase.auth.signOut();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: password.trim(),
    });
    if (error) throw new Error(`${label} login failed: ${error.message}`);
    return data.user.id;
  };

  const userId = await loginOnce('initial');
  const outboxBefore = await fetchOutboxCount(admin, userId);
  const sentBefore = await fetchSentExists(admin, userId);

  const queued1 = await callWelcomeRpc(supabase);
  const queued2 = await callWelcomeRpc(supabase);
  const outboxAfterRpc = await fetchOutboxCount(admin, userId);

  await loginOnce('second login');
  const queuedAfterRelogin = await callWelcomeRpc(supabase);

  await supabase.auth.signOut();
  await supabase.auth.signInWithPassword({ email, password: password.trim() });
  const queuedAfterThirdLogin = await callWelcomeRpc(supabase);

  console.log('');
  console.log('--- Resultados ---');
  console.log('welcome_emails_sent (before):', sentBefore);
  console.log('outbox rows (before):', outboxBefore);
  console.log('RPC 1st call queued:', queued1);
  console.log('RPC 2nd call queued (same session):', queued2);
  console.log('outbox rows (after RPC):', outboxAfterRpc);
  console.log('RPC after re-login:', queuedAfterRelogin);
  console.log('RPC after 3rd login:', queuedAfterThirdLogin);

  const failures = [];
  if (queued2) failures.push('RPC queued twice in same session');
  if (queuedAfterRelogin && sentBefore) failures.push('RPC queued after re-login for user with welcome_emails_sent');
  if (queuedAfterThirdLogin && sentBefore) failures.push('RPC queued after 3rd login for user with welcome_emails_sent');
  if (outboxBefore !== null && outboxAfterRpc !== null && outboxAfterRpc > outboxBefore + 1) {
    failures.push('outbox grew by more than 1 row during test');
  }

  if (failures.length) {
    console.error('\n❌ FAIL:', failures.join('; '));
    process.exit(1);
  }

  console.log('\n✅ PASS: login/repeated RPC does not re-queue welcome email');
  await supabase.auth.signOut();
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});
