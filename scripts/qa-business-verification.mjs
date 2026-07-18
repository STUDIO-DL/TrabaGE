/**
 * Business account verification MVP QA (Playwright + Supabase admin).
 * Usage: node scripts/qa-business-verification.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const BASE_URL = process.argv[2] || 'http://localhost:5173';
const ONBOARDING_KEY = 'trabage_onboarding_complete';
const TEST_PASSWORD = 'TestPass1!';
const OUT_DIR = path.join(__dirname, 'verification-qa-output');

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

function record(checklist, name, status, note = '') {
  const item = { name, status, note };
  checklist.push(item);
  const icon = status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'SKIP';
  console.log(`[${icon}] ${name}${note ? ` — ${note}` : ''}`);
}

function uniqueEmail(prefix) {
  return `qa-${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}@trabage-qa.test`;
}

async function resetBrowserState(context) {
  await context.addInitScript(({ onboardingKey }) => {
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem(onboardingKey, 'true');
  }, { onboardingKey: ONBOARDING_KEY });
}

async function createBusinessUser(admin) {
  const email = uniqueEmail('biz-verify');
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      role: 'business',
      account_kind: 'business',
      account_type: 'business',
      full_name: 'Verify QA Admin',
      company_name: 'Verify QA Co',
      sector: 'Tecnologia',
      city: 'Malabo',
    },
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  const userId = data.user.id;

  let profile = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise((r) => setTimeout(r, 1000));
    const { data: row } = await admin
      .from('company_profiles')
      .select('user_id, company_name')
      .eq('user_id', userId)
      .maybeSingle();
    if (row?.user_id) {
      profile = row;
      break;
    }
  }

  if (!profile?.user_id) {
    throw new Error('company profile not provisioned for test user');
  }

  return { email, userId };
}

async function deleteUser(admin, userId) {
  if (!userId) return;
  try {
    await admin.auth.admin.deleteUser(userId);
  } catch {
    /* best effort */
  }
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

async function login(page, email) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitForAuthShell(page);
  await page.locator('input[name="trabage-email"]').fill(email);
  await page.locator('input[name="trabage-password"]').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 25000 });
  await waitForAuthShell(page);
}

function tinyPdfBuffer(label) {
  const content = `%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n% ${label}`;
  return Buffer.from(content);
}

async function main() {
  const env = loadEnv();
  if (!env.url || !env.anonKey || !env.serviceRoleKey) {
    throw new Error('Missing Supabase env vars in .env.local');
  }

  const admin = createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const checklist = [];
  let userA = null;
  let userB = null;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const companyPdf = path.join(OUT_DIR, 'company-doc.pdf');
  const repPdf = path.join(OUT_DIR, 'rep-doc.pdf');
  fs.writeFileSync(companyPdf, tinyPdfBuffer('company'));
  fs.writeFileSync(repPdf, tinyPdfBuffer('representative'));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await resetBrowserState(context);
  const page = await context.newPage();

  try {
    userA = await createBusinessUser(admin);
    userB = await createBusinessUser(admin);

    await login(page, userA.email);

    await page.goto(`${BASE_URL}/business/profile`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForAuthShell(page);
    await page.waitForTimeout(2000);

    const profilePath = new URL(page.url()).pathname;
    if (profilePath.includes('/setup')) {
      throw new Error(`Redirected to setup instead of profile: ${profilePath}`);
    }

    const solicitBtn = page.getByRole('button', { name: 'Solicitar verificación' });
    record(
      checklist,
      'Unverified company shows Solicitar verificación',
      (await solicitBtn.count()) > 0 ? 'pass' : 'fail',
    );

    await page.goto(`${BASE_URL}/business/verification`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForAuthShell(page);
    await page.waitForTimeout(1500);

    const introText = await page.locator('body').innerText();
    record(
      checklist,
      'Verification page explains trust message',
      /La verificación ayuda a generar confianza/i.test(introText) ? 'pass' : 'fail',
    );

    const companyBlock = page.locator('text=Documento de la empresa').first();
    const repBlock = page.locator('text=Documento del representante').first();
    record(
      checklist,
      'Two document upload blocks visible',
      (await companyBlock.count()) > 0 && (await repBlock.count()) > 0 ? 'pass' : 'fail',
    );

    await page.getByRole('button', { name: 'Enviar solicitud de verificación' }).click();
    await page.waitForTimeout(500);
    const validationText = await page.locator('body').innerText();
    record(
      checklist,
      'Submit blocked when docs missing',
      /Sube el documento de la empresa/i.test(validationText) &&
        /Sube el documento del representante/i.test(validationText)
        ? 'pass'
        : 'fail',
    );

    const fileInputs = page.locator('input[type="file"]');
    await fileInputs.nth(0).setInputFiles(companyPdf);
    await fileInputs.nth(1).setInputFiles(repPdf);
    await page.waitForTimeout(500);

    const bodyAfterSelect = await page.locator('body').innerText();
    record(
      checklist,
      'Filenames shown after selection',
      bodyAfterSelect.includes('company-doc.pdf') && bodyAfterSelect.includes('rep-doc.pdf')
        ? 'pass'
        : 'fail',
    );

    await page.getByRole('button', { name: 'Enviar solicitud de verificación' }).click();
    await page.waitForTimeout(3000);

    const pendingText = await page.locator('body').innerText();
    const pendingOk =
      /Verificación en revisión/i.test(pendingText) || /solicitud enviada/i.test(pendingText);
    record(checklist, 'Submit request → En revisión', pendingOk ? 'pass' : 'fail', pendingText.slice(0, 120));

    const { data: requestRow } = await admin
      .from('verification_requests')
      .select('*')
      .eq('company_id', userA.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    record(
      checklist,
      'Verification record created in DB',
      requestRow?.status === 'pending' ? 'pass' : 'fail',
      requestRow ? `status=${requestRow.status}` : 'no row',
    );

    const companyPath = requestRow?.company_document_path;
    const repPath = requestRow?.representative_document_path;
    const { data: companyObj } = companyPath
      ? await admin.storage.from('company-verifications').download(companyPath)
      : { data: null };
    const { data: repObj } = repPath
      ? await admin.storage.from('company-verifications').download(repPath)
      : { data: null };

    record(
      checklist,
      'Documents saved in private storage bucket',
      companyObj && repObj ? 'pass' : 'fail',
      `${companyPath ?? '?'} | ${repPath ?? '?'}`,
    );

    await page.goto(`${BASE_URL}/business/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const reviewBtn = page.getByRole('button', { name: 'Verificación en revisión' });
    record(
      checklist,
      'Profile shows pending state, no duplicate submit',
      (await reviewBtn.count()) > 0 && (await solicitBtn.count()) === 0 ? 'pass' : 'fail',
    );

    const { data: profileA } = await admin
      .from('company_profiles')
      .select('is_verified, verification_status')
      .eq('user_id', userA.userId)
      .single();
    record(
      checklist,
      'Company profile verification_status pending',
      profileA?.verification_status === 'pending' ? 'pass' : 'fail',
      profileA?.verification_status ?? 'missing',
    );

    const anonB = createClient(env.url, env.anonKey);
    await anonB.auth.signInWithPassword({ email: userB.email, password: TEST_PASSWORD });
    const { data: crossDownload, error: crossError } = companyPath
      ? await anonB.storage.from('company-verifications').download(companyPath)
      : { data: null, error: { message: 'no path' } };

    record(
      checklist,
      'Cross-company document access blocked',
      !crossDownload && crossError ? 'pass' : 'fail',
      crossError?.message ?? 'unexpected access',
    );

    await page.goto(`${BASE_URL}/profile/${userA.userId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const publicBody = await page.locator('body').innerText();
    record(
      checklist,
      'Public profile hides badge when unverified',
      !/Empresa verificada|Organización verificada/i.test(publicBody) ? 'pass' : 'fail',
    );

    await admin
      .from('company_profiles')
      .update({
        is_verified: true,
        verification_status: 'approved',
        verified_status: 'verified',
        verified_at: new Date().toISOString(),
      })
      .eq('user_id', userA.userId);

    await page.goto(`${BASE_URL}/business/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const verifiedBtn = page.getByRole('button', { name: /verificada/i });
    record(
      checklist,
      'Verified company shows disabled verified button',
      (await verifiedBtn.count()) > 0 ? 'pass' : 'fail',
    );

    await page.goto(`${BASE_URL}/profile/${userA.userId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const publicVerified = await page.locator('body').innerText();
    record(
      checklist,
      'Public profile shows badge when verified',
      /verificada/i.test(publicVerified) ? 'pass' : 'fail',
    );
  } finally {
    await browser.close();
    await deleteUser(admin, userA?.userId);
    await deleteUser(admin, userB?.userId);
  }

  const reportPath = path.join(OUT_DIR, 'verification-qa-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ baseUrl: BASE_URL, checklist }, null, 2));

  const failed = checklist.filter((item) => item.status === 'fail').length;
  console.log(`\nReport: ${reportPath}`);
  console.log(`Summary: ${checklist.length - failed}/${checklist.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
