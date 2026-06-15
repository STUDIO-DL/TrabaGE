/**
 * Prueba el mismo flujo de login que usa la app en el navegador.
 * Uso: npm run test-login
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnv() {
  const env = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
  return {
    url: env.match(/^\s*VITE_SUPABASE_URL\s*=\s*(.+)\s*$/m)?.[1]?.trim(),
    anonKey: env.match(/^\s*VITE_SUPABASE_ANON_KEY\s*=\s*(.+)\s*$/m)?.[1]?.trim(),
  };
}

async function loginDirect(url, anonKey, email, password) {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
}

async function main() {
  const { url, anonKey } = loadEnv();
  const admins = JSON.parse(fs.readFileSync(path.join(__dirname, 'admins.local.json'), 'utf8'));
  const { email, password } = admins[0];

  console.log('\n🧪 test-login — mismo flujo que el navegador\n');

  const direct = await loginDirect(url, anonKey, email.trim().toLowerCase(), password);
  console.log('fetch directo:', direct.ok ? '✅' : '❌', direct.status, direct.body.error_description || 'OK');

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const setResult = direct.ok
    ? await supabase.auth.setSession({
        access_token: direct.body.access_token,
        refresh_token: direct.body.refresh_token,
      })
    : { error: { message: 'sin token' } };

  console.log('setSession:', setResult.error ? `❌ ${setResult.error.message}` : '✅');

  if (!setResult.error) {
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', setResult.data.session.user.id)
      .maybeSingle();
    console.log('rol:', roleRow?.role ?? '(sin rol)');
    console.log('redirect:', roleRow?.role === 'admin' ? '/admin' : '/account-type');
  }

  console.log('');
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
