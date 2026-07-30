/**
 * Live probe for Descubrir personas against the linked Supabase project.
 * Usage:
 *   TEST_LOGIN_EMAIL=... TEST_LOGIN_PASSWORD=... node scripts/probe-discover-people.mjs
 * Or scripts/admins.local.json personal account credentials.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) throw new Error('Missing .env.local');
  const env = fs.readFileSync(envPath, 'utf8');
  return {
    url: env.match(/^\s*VITE_SUPABASE_URL\s*=\s*(.+)\s*$/m)?.[1]?.trim()?.replace(/^["']|["']$/g, ''),
    anonKey: env
      .match(/^\s*VITE_SUPABASE_ANON_KEY\s*=\s*(.+)\s*$/m)?.[1]
      ?.trim()
      ?.replace(/^["']|["']$/g, ''),
  };
}

function loadCredentials() {
  const email = process.env.TEST_LOGIN_EMAIL?.trim().toLowerCase();
  const password = process.env.TEST_LOGIN_PASSWORD;
  if (email && password) return { email, password, source: 'env' };

  const adminsPath = path.join(__dirname, 'admins.local.json');
  if (!fs.existsSync(adminsPath)) {
    throw new Error('Set TEST_LOGIN_EMAIL/TEST_LOGIN_PASSWORD or scripts/admins.local.json');
  }
  const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));
  const account =
    admins.find((a) => a.role === 'personal' || a.accountKind === 'personal') ||
    admins.find((a) => a.email && a.password) ||
    admins[0];
  if (!account?.email || !account?.password) {
    throw new Error('No usable credentials in admins.local.json');
  }
  return {
    email: String(account.email).trim().toLowerCase(),
    password: account.password,
    source: 'admins.local.json',
  };
}

async function main() {
  const { url, anonKey } = loadEnv();
  const creds = loadCredentials();
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  });
  if (authError) throw authError;

  const me = authData.user?.id;
  const { count: totalCandidates } = await supabase
    .from('candidate_profiles')
    .select('user_id', { count: 'exact', head: true });

  const { count: setupTrue } = await supabase
    .from('candidate_profiles')
    .select('user_id', { count: 'exact', head: true })
    .eq('setup_complete', true);

  const { count: withName } = await supabase
    .from('candidate_profiles')
    .select('user_id', { count: 'exact', head: true })
    .neq('full_name', '');

  const { data: mine } = await supabase
    .from('candidate_profiles')
    .select('user_id, full_name, sector, city, country, setup_complete, is_active')
    .eq('user_id', me)
    .maybeSingle();

  const { data: people, error: rpcError } = await supabase.rpc('recommend_discover_people', {
    p_limit: 12,
    p_offset: 0,
  });

  const rows = Array.isArray(people) ? people : [];
  const selfInResults = rows.some((r) => r.user_id === me);
  const duplicates = rows.length - new Set(rows.map((r) => r.user_id)).size;

  console.log(
    JSON.stringify(
      {
        ok: !rpcError,
        authSource: creds.source,
        me,
        viewer: mine,
        counts: {
          candidate_profiles_visible: totalCandidates,
          setup_complete_true_visible: setupTrue,
          with_name_visible: withName,
        },
        rpcError: rpcError
          ? { message: rpcError.message, code: rpcError.code, details: rpcError.details }
          : null,
        recommendCount: rows.length,
        selfInResults,
        duplicates,
        sample: rows.slice(0, 5).map((r) => ({
          user_id: r.user_id,
          name: r.full_name,
          score: r.relevance_score,
          hasHeadline: Boolean(r.headline),
        })),
      },
      null,
      2,
    ),
  );

  await supabase.auth.signOut();
  if (rpcError) process.exitCode = 1;
  if (!rpcError && rows.length === 0) {
    console.error('WARN: RPC returned 0 rows — may still need migration 119 or no eligible peers');
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err?.message || err) }));
  process.exit(1);
});
