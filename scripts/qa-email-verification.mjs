/**
 * E2E email verification — registers test users, simulates confirm links, verifies profile landing.
 *
 * Usage:
 *   node scripts/qa-email-verification.mjs [baseUrl]
 *
 * Requires in .env.local:
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY (for generateLink + cleanup)
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const BASE_URL = process.argv[2] || process.env.VITE_APP_URL || 'http://localhost:5178';
const ONBOARDING_KEY = 'trabage_onboarding_complete';
const TEST_PASSWORD = 'TestPass1!';

const ACCOUNT_CASES = [
  {
    id: 'personal',
    role: 'personal',
    accountKind: 'personal',
    expectedProfilePath: '/personal/profile',
    signupData: {
      role: 'personal',
      account_kind: 'personal',
      account_type: 'personal',
      full_name: 'QA Personal User',
      city: 'Malabo',
    },
  },
  {
    id: 'business',
    role: 'business',
    accountKind: 'business',
    expectedProfilePath: '/business/profile',
    signupData: {
      role: 'business',
      account_kind: 'business',
      account_type: 'business',
      full_name: 'QA Business Admin',
      company_name: 'QA Business Co',
      sector: 'Tecnologia',
      city: 'Malabo',
    },
  },
  {
    id: 'organization',
    role: 'organization',
    accountKind: 'organization',
    expectedProfilePath: '/organization/profile',
    signupData: {
      role: 'organization',
      account_kind: 'organization',
      account_type: 'organization',
      full_name: 'QA Org Admin',
      company_name: 'QA Universidad Test',
      company_type: 'Institucion publica',
      city: 'Malabo',
    },
  },
];

function loadEnv() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('Missing .env.local');
  }
  const env = fs.readFileSync(envPath, 'utf8');
  const read = (key) => env.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`, 'm'))?.[1]?.trim();
  return {
    url: read('VITE_SUPABASE_URL'),
    anonKey: read('VITE_SUPABASE_ANON_KEY'),
    serviceRoleKey: read('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

function uniqueEmail(prefix) {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `qa-${prefix}-${stamp}-${rand}@trabage-qa.test`;
}

function record(results, name, status, note = '') {
  results.push({ name, status, note });
  const icon = status === 'pass' ? '✅' : status === 'skip' ? '⏭️' : '❌';
  console.log(`${icon} ${name}${note ? ` — ${note}` : ''}`);
}

function buildConfirmUrl(baseUrl, tokenHash) {
  const redirect = `${baseUrl.replace(/\/$/, '')}/auth/confirm`;
  return `${redirect}?token_hash=${encodeURIComponent(tokenHash)}&type=email`;
}

async function resetBrowserState(context, accountKind) {
  await context.addInitScript(
    ({ onboardingKey, kind }) => {
      sessionStorage.clear();
      localStorage.clear();
      localStorage.setItem(onboardingKey, 'true');
      if (kind) {
        localStorage.setItem('pending_account_type', kind);
      }
    },
    { onboardingKey: ONBOARDING_KEY, kind: accountKind },
  );
}

async function waitForAuthShell(page) {
  await page
    .waitForFunction(
      () =>
        !document.querySelector('[aria-busy="true"]') &&
        !/Verificando tu correo|Cargando|Loading/i.test(document.body?.innerText ?? ''),
      { timeout: 45000 },
    )
    .catch(() => {});
}

async function createAndConfirmUser(admin, anon, testCase, baseUrl) {
  const email = uniqueEmail(testCase.id);
  const redirectTo = `${baseUrl.replace(/\/$/, '')}/auth/confirm`;

  const { data: signupData, error: signupError } = await anon.auth.signUp({
    email,
    password: TEST_PASSWORD,
    options: {
      data: testCase.signupData,
      emailRedirectTo: redirectTo,
    },
  });

  if (signupError) {
    throw new Error(`signUp failed: ${signupError.message}`);
  }
  if (!signupData?.user?.id) {
    throw new Error('signUp returned no user id');
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    password: TEST_PASSWORD,
    options: {
      redirectTo,
      data: testCase.signupData,
    },
  });

  if (linkError) {
    throw new Error(`generateLink failed: ${linkError.message}`);
  }

  const tokenHash =
    linkData?.properties?.hashed_token ||
    linkData?.properties?.token_hash ||
    linkData?.properties?.verification_token;

  if (!tokenHash) {
    throw new Error('generateLink returned no token_hash');
  }

  return {
    email,
    userId: signupData.user.id,
    confirmUrl: buildConfirmUrl(baseUrl, tokenHash),
  };
}

async function deleteTestUser(admin, userId) {
  if (!userId) return;
  try {
    await admin.auth.admin.deleteUser(userId);
  } catch {
    // Best-effort cleanup.
  }
}

async function testConfirmLanding(page, confirmUrl, expectedProfilePath, label) {
  await page.goto(confirmUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitForAuthShell(page);

  const errorAlert = page.locator('[role="alert"]');
  if (await errorAlert.count()) {
    const text = (await errorAlert.first().innerText()).trim();
    if (text && !/Correo verificado|Entrando/i.test(text)) {
      throw new Error(text);
    }
  }

  await page.waitForURL(
    (url) => url.pathname.startsWith(expectedProfilePath) || url.pathname.includes('/setup/'),
    { timeout: 45000 },
  );

  const pathname = new URL(page.url()).pathname;
  if (!pathname.startsWith(expectedProfilePath) && !pathname.includes('/setup/')) {
    throw new Error(`expected ${expectedProfilePath} or setup, got ${pathname}`);
  }

  return pathname;
}

async function testAlreadyVerifiedReuse(page, confirmUrl, expectedProfilePath) {
  await page.goto(confirmUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitForAuthShell(page);

  const errorAlert = page.locator('[role="alert"]');
  if (await errorAlert.count()) {
    const text = (await errorAlert.first().innerText()).trim();
    if (/expirado|inválido|No pudimos/i.test(text)) {
      throw new Error(`reuse link showed error: ${text}`);
    }
  }

  await page.waitForURL(
    (url) =>
      url.pathname.startsWith(expectedProfilePath) ||
      url.pathname.includes('/setup/') ||
      url.pathname.includes('/profile'),
    { timeout: 45000 },
  );
}

async function main() {
  const env = loadEnv();
  const results = [];

  console.log(`\n🧪 TrabaGE email verification E2E — ${BASE_URL}\n`);

  if (!env.url || !env.anonKey) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY required');
  }

  if (!env.serviceRoleKey) {
    record(results, 'Service role key', 'skip', 'SUPABASE_SERVICE_ROLE_KEY missing — API tests skipped');
    console.log('\nAdd SUPABASE_SERVICE_ROLE_KEY to .env.local to run full verification tests.\n');
    process.exit(0);
  }

  const anon = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const browser = await chromium.launch({ headless: true });

  for (const testCase of ACCOUNT_CASES) {
    const label = testCase.id;
    let userId = null;

    try {
      const { email, userId: createdUserId, confirmUrl } = await createAndConfirmUser(
        admin,
        anon,
        testCase,
        BASE_URL,
      );
      userId = createdUserId;

      const context = await browser.newContext();
      await resetBrowserState(context, testCase.accountKind);
      const page = await context.newPage();

      const landed = await testConfirmLanding(
        page,
        confirmUrl,
        testCase.expectedProfilePath,
        label,
      );
      record(results, `Confirm link — ${label}`, 'pass', `email=${email} → ${landed}`);

      await testAlreadyVerifiedReuse(page, confirmUrl, testCase.expectedProfilePath);
      record(results, `Reuse confirm link — ${label}`, 'pass', 'already verified, no error screen');

      await context.close();
    } catch (err) {
      record(results, `Email verification — ${label}`, 'fail', err.message);
    } finally {
      await deleteTestUser(admin, userId);
    }
  }

  await browser.close();

  const failed = results.filter((r) => r.status === 'fail').length;
  const passed = results.filter((r) => r.status === 'pass').length;

  console.log('\n—'.repeat(40));
  console.log(`Results: ${passed} pass, ${failed} fail (${results.length} total)\n`);

  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
