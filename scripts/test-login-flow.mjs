/**
 * Prueba el mismo flujo de login que usa la app en el navegador.
 * Uso:
 *   npm run test-login
 *   TEST_LOGIN_EMAIL=... TEST_LOGIN_PASSWORD=... npm run test-login
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
    return [{ email, password, source: 'env' }];
  }

  const adminsPath = path.join(__dirname, 'admins.local.json');
  if (!fs.existsSync(adminsPath)) {
    throw new Error(
      'Define TEST_LOGIN_EMAIL/TEST_LOGIN_PASSWORD o crea scripts/admins.local.json',
    );
  }

  const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));
  if (!Array.isArray(admins) || admins.length === 0) {
    throw new Error('scripts/admins.local.json debe ser un array con al menos un admin.');
  }

  return admins.map((entry) => ({
    email: entry.email.trim().toLowerCase(),
    password: entry.password,
    source: 'admins.local.json',
  }));
}

async function testLogin(supabase, { email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: password.trim(),
  });

  if (error) {
    console.log('Login:', '❌', error.message);
    return false;
  }

  console.log('Login:', '✅');

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', data.user.id)
    .maybeSingle();

  console.log('rol:', roleRow?.role ?? '(sin rol)');
  console.log('redirect:', roleRow?.role === 'admin' ? '/admin' : '/account-type');
  await supabase.auth.signOut();
  return true;
}

async function main() {
  const { url, anonKey } = loadEnv();
  const credentials = loadCredentials();

  console.log('\n🧪 test-login — flujo signInWithPassword (app)\n');
  console.log('Project:', url.includes('jqzbpdojwzopwuaapqgl') ? '✅ TrabaGE' : '⚠️ otro proyecto');
  console.log('Credenciales desde:', credentials[0].source);
  console.log(`Cuentas a probar: ${credentials.length}\n`);

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let failed = 0;

  for (const cred of credentials) {
    console.log('—'.repeat(40));
    console.log('Email:', cred.email);
    const ok = await testLogin(supabase, cred);
    if (!ok) failed += 1;
    console.log('');
  }

  if (failed > 0) {
    console.log(`⚠️ ${failed} de ${credentials.length} login(s) fallaron.`);
    console.log('Si la contraseña es correcta y falla, ejecuta: npm run create-admins');
    console.log('O usa /forgot-password para restablecerla.\n');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
