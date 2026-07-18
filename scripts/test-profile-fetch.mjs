/**
 * Diagnose profile fetch failures against production Supabase.
 * Tests schema + anonymous public view reads (no login required for views).
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

const FULL_PROFILE_SELECT = `
  user_id, full_name, headline, about, city, province, country, avatar_path, cover_path,
  years_experience, contact_email, contact_whatsapp, phone_number, website_url, linkedin_url,
  cv_path, cv_name, cover_letter, job_preferences, notifications_enabled, notification_frequency,
  expected_salary, sector, show_education_in_intro, intro_education_id, setup_complete, is_active,
  created_at, updated_at,
  education(*), experience(*), certifications(*), skills(*), candidate_links(*), services(*), languages(*)
`;

const PUBLIC_PROFILE_SELECT = `
  user_id, full_name, headline, about, city, province, country, sector, avatar_path, cover_path,
  years_experience, show_education_in_intro, intro_education_id,
  contact_email, contact_whatsapp, setup_complete, is_active, created_at, updated_at
`;

const COMPANY_PROFILE_COLUMNS =
  'user_id, company_name, company_type, sector, description, city, country, address, website, founded_year, company_size, logo_path, cover_path, contact_name, contact_role, contact_email, contact_phone, contact_whatsapp, social_links, is_verified, verification_status, verified_status, setup_complete, is_active, created_at, updated_at';

async function tryQuery(label, fn) {
  const result = await fn();
  if (result.error) {
    console.log(`❌ ${label}: [${result.error.code}] ${result.error.message}`);
    return false;
  }
  console.log(`✅ ${label}: OK (${result.data?.length ?? (result.data ? 1 : 0)} rows)`);
  return true;
}

async function tryLogin(sb, email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error, userId: null };
  return { error: null, userId: data.user.id };
}

async function main() {
  const { url, anonKey } = loadEnv();
  const sb = createClient(url, anonKey, { auth: { persistSession: false } });

  console.log('=== Schema / view checks (anon) ===\n');

  await tryQuery('candidate_profiles_public + cover_path', () =>
    sb.from('candidate_profiles_public').select(PUBLIC_PROFILE_SELECT).limit(1),
  );

  await tryQuery('company_profiles_public + contact_name/role', () =>
    sb.from('company_profiles_public').select(COMPANY_PROFILE_COLUMNS).limit(1),
  );

  await tryQuery('get_my_role RPC (anon)', () => sb.rpc('get_my_role'));

  const { data: samplePublic } = await sb
    .from('candidate_profiles_public')
    .select('user_id')
    .limit(1)
    .maybeSingle();

  if (samplePublic?.user_id) {
    await tryQuery('candidate_profiles base sector column (anon)', () =>
      sb.from('candidate_profiles').select('user_id, sector, cover_path').eq('user_id', samplePublic.user_id).maybeSingle(),
    );
    await tryQuery('nested public full profile sections (anon)', () =>
      sb
        .from('candidate_profiles_public')
        .select(`${PUBLIC_PROFILE_SELECT}, education(*), experience(*)`)
        .eq('user_id', samplePublic.user_id)
        .maybeSingle(),
    );
    await tryQuery('nested candidate_profiles full (anon)', () =>
      sb
        .from('candidate_profiles')
        .select(`${PUBLIC_PROFILE_SELECT}, education(*), experience(*), certifications(*), skills(*), candidate_links(*), services(*), languages(*)`)
        .eq('user_id', samplePublic.user_id)
        .maybeSingle(),
    );
    await tryQuery('candidate base + sections (fixed path, anon)', async () => {
      const base = await sb
        .from('candidate_profiles')
        .select(PUBLIC_PROFILE_SELECT)
        .eq('user_id', samplePublic.user_id)
        .maybeSingle();
      if (base.error) return base;
      const sections = await sb.from('education').select('*').eq('user_id', samplePublic.user_id);
      if (sections.error) return sections;
      return { data: { ...base.data, education: sections.data }, error: null };
    });
  }

  // Try logins from admins.local.json
  const adminsPath = path.join(__dirname, 'admins.local.json');
  const accounts = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));

  console.log('\n=== Authenticated profile fetch ===\n');

  for (const { email, password } of accounts) {
    await sb.auth.signOut();
    const { error: loginErr, userId } = await tryLogin(sb, email.trim(), password);
    if (loginErr) {
      console.log(`⏭️  ${email}: login failed (${loginErr.message})`);
      continue;
    }

    const { data: roleRow } = await sb.from('user_roles').select('role').eq('user_id', userId).maybeSingle();
    const { data: rpcRole, error: rpcErr } = await sb.rpc('get_my_role');
    console.log(`\n👤 ${email} (${userId.slice(0, 8)}…)`);
    console.log(`   role table: ${roleRow?.role ?? '(none)'} | get_my_role: ${rpcErr ? rpcErr.message : rpcRole}`);

    await tryQuery('candidate_profiles columns', () =>
      sb.from('candidate_profiles').select('user_id, cover_path').eq('user_id', userId).maybeSingle(),
    );

    await tryQuery('getCandidateFullProfile (nested)', () =>
      sb.from('candidate_profiles').select(FULL_PROFILE_SELECT).eq('user_id', userId).maybeSingle(),
    );

    await tryQuery('company_profiles + services', () =>
      sb
        .from('company_profiles')
        .select(`${COMPANY_PROFILE_COLUMNS}, company_services(*)`)
        .eq('user_id', userId)
        .maybeSingle(),
    );

    break; // stop after first successful login
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
