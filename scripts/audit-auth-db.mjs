/**
 * One-off auth integrity audit against linked Supabase project.
 * Reads credentials from .env.local (never prints secrets).
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal() {
  const env = {};
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  } catch {
    // ignore
  }
  return env;
}

const env = loadEnvLocal();
const url = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!url || !serviceKey) {
  console.log(JSON.stringify({
    ok: false,
    error: 'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
    hasAnon: Boolean(anonKey),
  }, null, 2));
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const QUERIES = {
  roleDistribution: `
    SELECT role, COUNT(*)::int AS count
    FROM public.user_roles
    GROUP BY role
    ORDER BY role;
  `,
  usersWithoutRole: `
    SELECT u.id, u.email, u.created_at
    FROM auth.users u
    LEFT JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE ur.user_id IS NULL
    ORDER BY u.created_at DESC
    LIMIT 20;
  `,
  rolesWithoutProfile: `
    SELECT ur.user_id, ur.role, u.email, u.created_at
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    LEFT JOIN public.candidate_profiles cp ON cp.user_id = ur.user_id
    LEFT JOIN public.company_profiles co ON co.user_id = ur.user_id
    WHERE ur.role = 'personal' AND cp.user_id IS NULL
       OR ur.role IN ('business','organization') AND co.user_id IS NULL
    ORDER BY u.created_at DESC
    LIMIT 30;
  `,
  dualProfiles: `
    SELECT cp.user_id, u.email
    FROM public.candidate_profiles cp
    JOIN public.company_profiles co ON co.user_id = cp.user_id
    JOIN auth.users u ON u.id = cp.user_id
    LIMIT 20;
  `,
  roleProfileMismatch: `
    SELECT ur.user_id, ur.role, u.email,
           cp.user_id IS NOT NULL AS has_candidate,
           co.user_id IS NOT NULL AS has_company,
           co.company_type
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    LEFT JOIN public.candidate_profiles cp ON cp.user_id = ur.user_id
    LEFT JOIN public.company_profiles co ON co.user_id = ur.user_id
    WHERE (ur.role = 'personal' AND cp.user_id IS NULL)
       OR (ur.role IN ('business','organization') AND co.user_id IS NULL)
       OR (ur.role = 'personal' AND co.user_id IS NOT NULL)
       OR (ur.role IN ('business','organization') AND cp.user_id IS NOT NULL)
    ORDER BY u.created_at DESC
    LIMIT 30;
  `,
  recentSignups: `
    SELECT u.id, u.email, u.email_confirmed_at, u.created_at,
           u.raw_user_meta_data->>'role' AS meta_role,
           ur.role AS db_role,
           cp.user_id IS NOT NULL AS has_candidate,
           co.user_id IS NOT NULL AS has_company
    FROM auth.users u
    LEFT JOIN public.user_roles ur ON ur.user_id = u.id
    LEFT JOIN public.candidate_profiles cp ON cp.user_id = u.id
    LEFT JOIN public.company_profiles co ON co.user_id = u.id
    ORDER BY u.created_at DESC
    LIMIT 15;
  `,
  welcomeEmailPending: `
    SELECT COUNT(*)::int AS outbox_count FROM public.welcome_email_outbox;
  `,
};

async function runSql(label, sql) {
  const { data, error } = await admin.rpc('exec_sql', { query: sql }).maybeSingle?.();
  // Fallback: use REST if no exec_sql RPC
  if (error || data === undefined) {
    const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    if (res.ok) {
      return { label, rows: await res.json() };
    }
    // Use pg via supabase sql endpoint if available
    return { label, error: error?.message || `HTTP ${res.status}`, sql: sql.slice(0, 80) };
  }
  return { label, rows: data };
}

async function main() {
  const results = { projectHost: new URL(url).hostname, checks: {} };

  // Use PostgREST raw queries via individual table selects where possible
  const { data: roles, error: rolesErr } = await admin.from('user_roles').select('role');
  if (rolesErr) {
    results.checks.roleDistribution = { error: rolesErr.message };
  } else {
    const dist = {};
    for (const row of roles) dist[row.role] = (dist[row.role] || 0) + 1;
    results.checks.roleDistribution = dist;
  }

  const { data: recentRoles } = await admin
    .from('user_roles')
    .select('user_id, role, created_at')
    .order('created_at', { ascending: false })
    .limit(15);

  results.checks.recentRoles = recentRoles;

  const { data: candidates } = await admin
    .from('candidate_profiles')
    .select('user_id, full_name, setup_complete, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: companies } = await admin
    .from('company_profiles')
    .select('user_id, company_name, company_type, setup_complete, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  results.checks.recentCandidateProfiles = candidates;
  results.checks.recentCompanyProfiles = companies;

  const { count: outboxCount } = await admin
    .from('welcome_email_outbox')
    .select('*', { count: 'exact', head: true });

  results.checks.welcomeEmailOutboxCount = outboxCount;

  // Auth users via admin API
  const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ perPage: 20 });
  if (listErr) {
    results.checks.authUsers = { error: listErr.message };
  } else {
    const users = listData.users.map((u) => ({
      id: u.id,
      email: u.email,
      confirmed: Boolean(u.email_confirmed_at),
      created_at: u.created_at,
      meta_role: u.user_metadata?.role ?? u.user_metadata?.account_kind ?? null,
      providers: (u.identities || []).map((i) => i.provider),
    }));
    results.checks.recentAuthUsers = users;

    const roleByUser = new Map((recentRoles || []).map((r) => [r.user_id, r.role]));
    const candidateSet = new Set((candidates || []).map((c) => c.user_id));
    const companySet = new Set((companies || []).map((c) => c.user_id));

    const integrity = [];
    for (const u of users) {
      const role = roleByUser.get(u.id);
      const hasCandidate = candidateSet.has(u.id);
      const hasCompany = companySet.has(u.id);
      const issues = [];
      if (!role) issues.push('missing_user_role');
      if (role === 'personal' && !hasCandidate) issues.push('missing_candidate_profile');
      if ((role === 'business' || role === 'organization') && !hasCompany) {
        issues.push('missing_company_profile');
      }
      if (role === 'personal' && hasCompany) issues.push('dual_profile_type');
      if ((role === 'business' || role === 'organization') && hasCandidate) {
        issues.push('dual_profile_type');
      }
      if (issues.length) {
        integrity.push({ email: u.email, role, issues, meta_role: u.meta_role });
      }
    }
    results.checks.integrityIssuesInRecentUsers = integrity;
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
