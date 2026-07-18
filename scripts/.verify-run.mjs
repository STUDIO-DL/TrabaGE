/**
 * Authenticated org/business profile verification (Playwright + Supabase admin).
 * Usage: node scripts/qa-org-business-profile-verify.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve('C:/Users/user/Desktop/TrabaGE/TrabaGE');
const BASE_URL = process.argv[2] || 'http://localhost:5173';
const ONBOARDING_KEY = 'trabage_onboarding_complete';
const TEST_PASSWORD = 'TestPass1!';
const OUT_DIR = path.join('C:/Users/user/Desktop/TrabaGE/TrabaGE/scripts/profile-verify-output');

const CASES = [
  {
    id: 'organization',
    profilePath: '/organization/profile',
    companyName: 'ZARREL',
    signupData: {
      role: 'organization',
      account_kind: 'organization',
      account_type: 'organization',
      full_name: 'ZARREL Org Admin',
      company_name: 'ZARREL',
      company_type: 'Institucion publica',
      city: 'Malabo',
    },
  },
  {
    id: 'business',
    profilePath: '/business/profile',
    companyName: 'ZARREL Business QA',
    signupData: {
      role: 'business',
      account_kind: 'business',
      account_type: 'business',
      full_name: 'ZARREL Business Admin',
      company_name: 'ZARREL Business QA',
      sector: 'Tecnologia',
      city: 'Malabo',
    },
  },
];

function loadEnv() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) throw new Error('Missing .env.local');
  const env = fs.readFileSync(envPath, 'utf8');
  const read = (key) => env.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`, 'm'))?.[1]?.trim();
  return {
    url: read('VITE_SUPABASE_URL'),
    anonKey: read('VITE_SUPABASE_ANON_KEY'),
    serviceRoleKey: read('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

function record(checklist, section, name, status, note = '') {
  const item = { section, name, status, note };
  checklist.push(item);
  const icon = status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'SKIP';
  console.log(`[${icon}] ${section} — ${name}${note ? ` — ${note}` : ''}`);
}

function uniqueEmail(prefix) {
  return `qa-${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}@trabage-qa.test`;
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

async function resetBrowserState(context) {
  await context.addInitScript(({ onboardingKey }) => {
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem(onboardingKey, 'true');
  }, { onboardingKey: ONBOARDING_KEY });
}

async function createAndProvisionUser(env, admin, testCase) {
  const email = uniqueEmail(testCase.id);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: testCase.signupData,
  });
  if (error) throw new Error('createUser: ' + error.message);
  if (!data?.user?.id) throw new Error('createUser: no user id');
  const userId = data.user.id;
  await new Promise((r) => setTimeout(r, 1500));
  const authed = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: loginErr } = await authed.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (loginErr) throw new Error('provision login: ' + loginErr.message);
  const { error: provErr } = await authed.rpc('provision_user_profile', {
    p_user_id: userId,
    p_overrides: {
      company_name: testCase.companyName,
      ...(testCase.signupData.sector ? { sector: testCase.signupData.sector } : {}),
      ...(testCase.signupData.company_type ? { company_type: testCase.signupData.company_type } : {}),
      ...(testCase.signupData.city ? { city: testCase.signupData.city } : {}),
    },
  });
  if (provErr) throw new Error('provision_user_profile: ' + provErr.message);
  const { data: roleRow } = await authed.from('user_roles').select('role').eq('user_id', userId).maybeSingle();
  const { data: profile } = await authed.from('company_profiles').select('user_id, company_name, logo_path, is_verified').eq('user_id', userId).maybeSingle();
  const session = (await authed.auth.getSession()).data.session;
  await authed.auth.signOut();
  return { email, userId, role: roleRow?.role, profile, session };
}

async function deleteTestUser(admin, userId) {
  if (!userId) return;
  try {
    await admin.auth.admin.deleteUser(userId);
  } catch {
    /* best effort */
  }
}

function buildAuthStoragePayload(session) {
  return JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });
}

async function seedSession(context, session) {
  const payload = buildAuthStoragePayload(session);
  await context.addInitScript(({ onboardingKey, authKey, authPayload }) => {
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem(onboardingKey, "true");
    localStorage.setItem(authKey, authPayload);
  }, { onboardingKey: ONBOARDING_KEY, authKey: "trabage-auth", authPayload: payload });
}

async function loginViaUi(page, email) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await waitForAuthShell(page);
  await page.locator('input[name="trabage-email"]').fill(email);
  await page.locator('input[name="trabage-password"]').fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /Iniciar sesi/i }).first().click();
  const outcome = await Promise.race([
    page.waitForFunction(() => Boolean(localStorage.getItem("trabage-auth")), { timeout: 30000 }).then(() => "session"),
    page.locator('[role="alert"]').first().waitFor({ timeout: 30000 }).then(() => "error"),
  ]).catch(() => "timeout");
  if (outcome === "error") {
    const msg = (await page.locator('[role="alert"]').first().innerText()).trim();
    throw new Error(msg || "login failed");
  }
  if (outcome !== "session") throw new Error("login timeout (no trabage-auth)");
  await waitForAuthShell(page);
}

async function ensureTinyLogoFile() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pngPath = path.join(OUT_DIR, 'test-logo.png');
  const webpPath = path.join(OUT_DIR, 'test-logo.webp');
  await sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 20, g: 120, b: 200 } },
  })
    .png()
    .toFile(pngPath);
  await sharp(pngPath).webp().toFile(webpPath);
  return { pngPath, webpPath };
}

async function getLogoSrc(page) {
  const logoImg = page.locator('section img').first();
  if (!(await logoImg.count())) return null;
  return logoImg.getAttribute('src');
}

async function runCase(context, env, admin, testCase, checklist, logoFiles) {
  const section = testCase.id;
  let userId = null;
  let page;
  let created;

  try {
    created = await createAndProvisionUser(env, admin, testCase);
    userId = created.userId;
    await resetBrowserState(context);
    page = await context.newPage();
    record(
      checklist,
      section,
      'Create temp user (admin API + company_name metadata)',
      created.profile?.user_id ? 'pass' : 'fail',
      `email=${created.email} role=${created.role ?? '?'} company_name=${created.profile?.company_name ?? '(missing)'}`,
    );

    await loginViaUi(page, created.email);
    record(checklist, section, 'Playwright login', 'pass');

    await page.goto(`${BASE_URL}${testCase.profilePath}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForAuthShell(page);
    await page.waitForTimeout(1500);

    const pathname = new URL(page.url()).pathname;
    record(
      checklist,
      section,
      `Visit ${testCase.profilePath}`,
      pathname.startsWith(testCase.profilePath) ? 'pass' : 'fail',
      pathname,
    );

    const headerText = await page.locator('section').first().innerText().catch(() => '');
    const h1Text = await page.locator('h1').first().innerText().catch(() => '');
    const nameVisible =
      headerText.includes(testCase.companyName) ||
      h1Text.includes(testCase.companyName) ||
      (await page.getByText(testCase.companyName, { exact: true }).count()) > 0;

    record(
      checklist,
      section,
      `Company name "${testCase.companyName}" in profile header`,
      nameVisible ? 'pass' : 'fail',
      nameVisible ? (h1Text.includes(testCase.companyName) ? 'in h1' : 'in header (CompanyNameWithBadge)') : `h1="${h1Text.slice(0, 80)}"`,
    );

    const badge = page.locator('[role="img"][aria-label*="verificada"], [role="img"][aria-label*="verificada" i]').first();
    const badgeCount = await badge.count();
    record(
      checklist,
      section,
      'Owner verification badge visible (gray/unverified)',
      badgeCount > 0 ? 'pass' : 'fail',
      badgeCount ? await badge.getAttribute('aria-label') : 'not found',
    );

    const logoBtn = page.getByRole('button', { name: 'Subir logo' });
    const hasLogoBtn = (await logoBtn.count()) > 0;
    const logoDisabled = hasLogoBtn ? await logoBtn.first().isDisabled() : null;
    record(
      checklist,
      section,
      'Logo upload button present',
      hasLogoBtn && !logoDisabled ? 'pass' : 'fail',
      hasLogoBtn ? (logoDisabled ? 'disabled' : 'enabled') : 'missing',
    );

    const beforeSrc = await getLogoSrc(page);
    let uploadStatus = 'fail';
    let uploadNote = '';

    if (hasLogoBtn) {
      await logoBtn.first().click();
      const modal = page.getByRole('dialog').filter({ hasText: 'Uso del logotipo' });
      await modal.waitFor({ timeout: 8000 });
      await modal.locator('input[type="checkbox"]').check();
      await modal.getByRole('button', { name: 'Continuar y elegir archivo' }).click();

      const fileInput = page.locator('input[type="file"][accept*="webp"]');
      await fileInput.setInputFiles(logoFiles.webpPath);

      const permError = page.locator('[role="alert"]').filter({ hasText: /permiso|permission|RLS|403/i });
      const successToast = page.getByText(/Logo actualizado/i);

      const uploadOutcome = await Promise.race([
        successToast.waitFor({ timeout: 30000 }).then(() => 'success'),
        permError.waitFor({ timeout: 30000 }).then(() => 'perm'),
        page.locator('[role="alert"]').first().waitFor({ timeout: 30000 }).then(() => 'alert'),
      ]).catch(() => 'timeout');

      if (uploadOutcome === 'perm') {
        uploadNote = (await permError.first().innerText()).trim();
      } else if (uploadOutcome === 'alert') {
        uploadNote = (await page.locator('[role="alert"]').first().innerText()).trim();
        uploadStatus = /permiso|permission|RLS/i.test(uploadNote) ? 'fail' : 'pass';
      } else if (uploadOutcome === 'success') {
        uploadStatus = 'pass';
        uploadNote = 'Logo actualizado toast';
      } else {
        uploadNote = 'upload timeout (no toast)';
      }

      if (uploadOutcome === 'success') uploadStatus = 'pass';
      else if (/permiso|permission|RLS|403/i.test(uploadNote)) uploadStatus = 'fail';
    } else {
      uploadNote = 'skipped — no upload button';
      uploadStatus = 'fail';
    }

    record(checklist, section, 'Logo upload without permissions error (migration 080)', uploadStatus, uploadNote);

    await page.waitForTimeout(2000);
    const afterSrc = await getLogoSrc(page);

    let persistStatus = 'skip';
    let persistNote = '';
    if (uploadStatus === 'pass') {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForAuthShell(page);
      await page.waitForTimeout(2000);
      const reloadSrc = await getLogoSrc(page);
      const authed = createClient(env.url, env.anonKey, { auth: { persistSession: false } });
      await authed.auth.signInWithPassword({ email: created.email, password: TEST_PASSWORD });
      const dbLogo = (
        await authed.from('company_profiles').select('logo_path').eq('user_id', userId).maybeSingle()
      ).data?.logo_path;
      await authed.auth.signOut();

      const srcChanged = afterSrc && afterSrc !== beforeSrc;
      const persisted = reloadSrc && reloadSrc === afterSrc && Boolean(dbLogo);
      persistStatus = persisted && srcChanged ? 'pass' : 'fail';
      persistNote = `before=${Boolean(beforeSrc)} after=${Boolean(afterSrc)} reload=${Boolean(reloadSrc)} db_logo_path=${dbLogo ?? 'null'}`;
    } else {
      persistNote = 'upload did not succeed';
    }

    record(checklist, section, 'Logo persists after refresh', persistStatus, persistNote);

    const shotPath = path.join(OUT_DIR, `${section}-profile-verify.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
  } finally {
    await deleteTestUser(admin, userId);
    record(checklist, section, 'Cleanup test user', userId ? 'pass' : 'skip');
  }
}

async function main() {
  const env = loadEnv();
  const checklist = [];

  if (!env.serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY missing in .env.local');
    process.exit(1);
  }

  console.log(`\nTrabaGE org/business profile verify — ${BASE_URL}\n`);

  const admin = createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const logoFiles = await ensureTinyLogoFile();
  const browser = await chromium.launch({ headless: true });

  for (const testCase of CASES) {
    console.log(`\n--- ${testCase.id} ---\n`);
    const context = await browser.newContext({ locale: 'es-ES' });
    try {
      await runCase(context, env, admin, testCase, checklist, logoFiles);
    } finally {
      await context.close();
    }
  }

  await browser.close();

  const report = {
    baseUrl: BASE_URL,
    timestamp: new Date().toISOString(),
    checklist,
    summary: {
      pass: checklist.filter((c) => c.status === 'pass').length,
      fail: checklist.filter((c) => c.status === 'fail').length,
      skip: checklist.filter((c) => c.status === 'skip').length,
    },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'auth-profile-verify-report.json'), JSON.stringify(report, null, 2));

  console.log('\n' + '='.repeat(48));
  console.log(`SUMMARY: ${report.summary.pass} pass, ${report.summary.fail} fail, ${report.summary.skip} skip`);
  console.log('='.repeat(48));

  for (const item of checklist) {
    console.log(`  [${item.status.toUpperCase()}] ${item.section} | ${item.name}${item.note ? ` (${item.note})` : ''}`);
  }

  if (report.summary.fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

