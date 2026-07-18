/**
 * Verifica que los campos de perfil se lean y escriban contra Supabase.
 *
 * Uso:
 *   TEST_LOGIN_EMAIL=... TEST_LOGIN_PASSWORD=... node scripts/verify-profile-persistence.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) throw new Error('No se encontró .env.local');
  const env = fs.readFileSync(envPath, 'utf8');
  return {
    url: env.match(/^\s*VITE_SUPABASE_URL\s*=\s*(.+)\s*$/m)?.[1]?.trim(),
    anonKey: env.match(/^\s*VITE_SUPABASE_ANON_KEY\s*=\s*(.+)\s*$/m)?.[1]?.trim(),
  };
}

function loadCredentials() {
  const email = process.env.TEST_LOGIN_EMAIL?.trim().toLowerCase();
  const password = process.env.TEST_LOGIN_PASSWORD;
  if (email && password) return { email, password };

  const adminsPath = path.join(__dirname, 'admins.local.json');
  if (!fs.existsSync(adminsPath)) {
    throw new Error('Define TEST_LOGIN_EMAIL/TEST_LOGIN_PASSWORD o scripts/admins.local.json');
  }
  const [first] = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));
  return { email: first.email.trim().toLowerCase(), password: first.password };
}

const CANDIDATE_COLUMNS =
  'user_id,full_name,headline,about,sector,city,country,contact_email,contact_whatsapp,setup_complete';
const COMPANY_COLUMNS =
  'user_id,company_name,description,sector,city,country,contact_name,contact_role,contact_email,contact_phone,contact_whatsapp,setup_complete';

async function assertWrite(label, result) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (result.data == null) {
    throw new Error(`${label}: escritura sin fila (RLS o fila inexistente)`);
  }
  return result.data;
}

async function testCandidate(sb, userId) {
  const marker = `PERSIST_CAND_${Date.now()}`;
  const row = await assertWrite(
    'candidate update',
    await sb
      .from('candidate_profiles')
      .update({ headline: marker })
      .eq('user_id', userId)
      .select(CANDIDATE_COLUMNS)
      .maybeSingle(),
  );

  if (row.headline !== marker) {
    throw new Error(`candidate read mismatch: expected ${marker}, got ${row.headline}`);
  }

  const { data: reread } = await sb
    .from('candidate_profiles')
    .select('headline')
    .eq('user_id', userId)
    .maybeSingle();

  if (reread?.headline !== marker) {
    throw new Error('candidate re-read after update failed');
  }

  console.log('✅ candidate_profiles headline persisted');
}

async function testCompany(sb, userId) {
  const marker = `PERSIST_CO_${Date.now()}`;
  const row = await assertWrite(
    'company update',
    await sb
      .from('company_profiles')
      .update({
        contact_name: marker,
        contact_role: 'QA Tester',
      })
      .eq('user_id', userId)
      .select(COMPANY_COLUMNS)
      .maybeSingle(),
  );

  if (row.contact_name !== marker || row.contact_role !== 'QA Tester') {
    throw new Error('company contact fields not returned after update (revisa COMPANY_PROFILE_COLUMNS)');
  }

  const { data: reread } = await sb
    .from('company_profiles')
    .select('contact_name, contact_role')
    .eq('user_id', userId)
    .maybeSingle();

  if (reread?.contact_name !== marker) {
    throw new Error('company re-read after update failed');
  }

  console.log('✅ company_profiles contact_name/contact_role persisted');
}

async function main() {
  const { url, anonKey } = loadEnv();
  const { email, password } = loadCredentials();
  const sb = createClient(url, anonKey, { auth: { persistSession: false } });

  const { data: auth, error: loginErr } = await sb.auth.signInWithPassword({ email, password });
  if (loginErr) throw new Error(`Login fallido: ${loginErr.message}`);

  const userId = auth.user.id;
  const { data: roleRow } = await sb.from('user_roles').select('role').eq('user_id', userId).maybeSingle();
  const { data: rpcRole } = await sb.rpc('get_my_role');

  console.log('Usuario:', userId);
  console.log('Rol (tabla):', roleRow?.role ?? '(sin rol)');
  console.log('Rol (RPC):', rpcRole ?? '(null)');

  const [{ data: candidate }, { data: company }] = await Promise.all([
    sb.from('candidate_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
    sb.from('company_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
  ]);

  if (candidate) await testCandidate(sb, userId);
  else if (company) await testCompany(sb, userId);
  else throw new Error('El usuario no tiene perfil candidate ni company');

  await sb.auth.signOut();
  console.log('\nTodas las comprobaciones pasaron.');
}

main().catch((error) => {
  console.error('\n❌', error.message);
  process.exit(1);
});
