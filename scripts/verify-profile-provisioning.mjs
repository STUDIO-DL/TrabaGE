/**
 * Verifies unified profile provisioning after migration 075 is applied.
 *
 * Usage:
 *   node scripts/verify-profile-provisioning.mjs
 *
 * Requires .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 * Optional: SUPABASE_SERVICE_ROLE_KEY for orphan-user audit (read-only counts).
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
    serviceKey: env.match(/^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)\s*$/m)?.[1]?.trim(),
  };
}

function randomEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@trabage-test.local`;
}

async function assertRpcExists(supabase) {
  const { error } = await supabase.rpc('provision_user_profile', {
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_overrides: null,
  });

  if (error?.message?.includes('Could not find the function')) {
    throw new Error(
      'RPC provision_user_profile no existe. Aplica la migración 075: supabase db push',
    );
  }
}

async function testEmailSignupProvision(supabase, { role, metadata, overrides, label }) {
  const email = randomEmail(label);
  const password = `Test!${Date.now()}Aa1`;

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, ...metadata, account_kind: role === 'personal' ? 'personal' : role },
    },
  });

  if (signUpError) throw new Error(`${label} signUp: ${signUpError.message}`);
  const userId = signUpData.user?.id;
  if (!userId) throw new Error(`${label} signUp: sin user id`);

  const { data: sessionData } = await supabase.auth.signInWithPassword({ email, password });
  const session = sessionData.session;
  if (!session) {
    console.log(`  ⚠️  ${label}: email no confirmado — omitiendo verificación autenticada`);
    return { skipped: true };
  }

  const authed = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: provisionData, error: provisionError } = await authed.rpc('provision_user_profile', {
    p_user_id: userId,
    p_overrides: overrides ?? null,
  });

  if (provisionError) throw new Error(`${label} provision: ${provisionError.message}`);

  const { data: roleRow } = await authed.from('user_roles').select('role').eq('user_id', userId).maybeSingle();

  const table = role === 'personal' ? 'candidate_profiles' : 'company_profiles';
  const { data: profile } = await authed.from(table).select('*').eq('user_id', userId).maybeSingle();

  const ok = Boolean(roleRow?.role) && Boolean(profile?.user_id);
  console.log(`  ${ok ? '✅' : '❌'} ${label}: role=${roleRow?.role ?? '—'} profile=${profile?.user_id ? 'yes' : 'no'} created=${provisionData?.created ?? false}`);

  if (role === 'personal' && profile) {
    console.log(`     full_name="${profile.full_name}" city="${profile.city ?? ''}"`);
  }
  if (role !== 'personal' && profile) {
    console.log(`     company_name="${profile.company_name}" sector="${profile.sector ?? ''}" type="${profile.company_type ?? ''}"`);
  }

  await authed.auth.signOut();
  return { ok, userId, profile, role: roleRow?.role };
}

async function auditOrphanUsers(serviceClient) {
  if (!serviceClient) {
    console.log('\n⏭️  Auditoría de huérfanos omitida (sin SUPABASE_SERVICE_ROLE_KEY)');
    return;
  }

  const { data: roles, error } = await serviceClient
    .from('user_roles')
    .select('user_id, role')
    .in('role', ['personal', 'business', 'organization']);

  if (error) {
    console.log(`\n⚠️  No se pudo auditar huérfanos: ${error.message}`);
    return;
  }

  let orphans = 0;
  for (const row of roles ?? []) {
    const [{ data: candidate }, { data: company }] = await Promise.all([
      serviceClient.from('candidate_profiles').select('user_id').eq('user_id', row.user_id).maybeSingle(),
      serviceClient.from('company_profiles').select('user_id').eq('user_id', row.user_id).maybeSingle(),
    ]);
    if (!candidate?.user_id && !company?.user_id) orphans += 1;
  }

  console.log(`\n📊 Usuarios con rol pero sin perfil: ${orphans} / ${roles?.length ?? 0}`);
}

async function main() {
  const { url, anonKey, serviceKey } = loadEnv();
  process.env.SUPABASE_URL = url;
  process.env.SUPABASE_ANON_KEY = anonKey;

  console.log('\n🧪 verify-profile-provisioning — migración 075\n');

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await assertRpcExists(supabase);
  console.log('✅ RPC provision_user_profile disponible\n');

  const cases = [
    {
      label: 'personal-email',
      role: 'personal',
      metadata: { full_name: 'Test Personal', city: 'Malabo' },
    },
    {
      label: 'business-email',
      role: 'business',
      metadata: {
        company_name: 'Test Business SL',
        sector: 'Tecnología',
        city: 'Malabo',
      },
    },
    {
      label: 'organization-email',
      role: 'organization',
      metadata: {
        company_name: 'Universidad Test',
        company_type: 'Institucion publica',
        city: 'Malabo',
      },
    },
  ];

  for (const testCase of cases) {
    try {
      await testEmailSignupProvision(supabase, testCase);
    } catch (err) {
      console.log(`  ❌ ${testCase.label}: ${err.message}`);
    }
  }

  const serviceClient = serviceKey
    ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

  await auditOrphanUsers(serviceClient);
  console.log('');
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
