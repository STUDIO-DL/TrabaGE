/**
 * Diagnóstico de login admin (solo local, no commitear resultados).
 * Uso: npm run verify-admins
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(root, '.env.local');
  const env = fs.readFileSync(envPath, 'utf8');
  return {
    url: env.match(/^\s*VITE_SUPABASE_URL\s*=\s*(.+)\s*$/m)?.[1]?.trim(),
    anonKey: env.match(/^\s*VITE_SUPABASE_ANON_KEY\s*=\s*(.+)\s*$/m)?.[1]?.trim(),
  };
}

async function main() {
  const { url, anonKey } = loadEnv();
  const admins = JSON.parse(fs.readFileSync(path.join(__dirname, 'admins.local.json'), 'utf8'));

  const anon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\n🔎 Verificando login en ${url}\n`);

  for (const { email } of admins) {
    const password = admins.find((a) => a.email === email)?.password;
    const { data, error } = await anon.auth.signInWithPassword({ email, password });

    if (error) {
      console.log(`❌ ${email}`);
      console.log(`   ${error.message}`);
      continue;
    }

    const userId = data.user?.id;
    const { data: roleRow } = await anon
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    console.log(`✅ ${email}`);
    console.log(`   user_id: ${userId}`);
    console.log(`   role: ${roleRow?.role ?? '(sin rol legible)'}`);
    await anon.auth.signOut();
  }

  console.log('');
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}\n`);
  process.exit(1);
});
