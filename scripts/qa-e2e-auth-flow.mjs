/**
 * Playwright E2E smoke for guest auth flows + optional login/logout.
 *
 * Usage:
 *   node scripts/qa-e2e-auth-flow.mjs [baseUrl]
 *
 * Optional credentials (same as test-login-flow.mjs):
 *   TEST_LOGIN_EMAIL / TEST_LOGIN_PASSWORD
 *   or scripts/admins.local.json
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const BASE_URL = process.argv[2] || 'http://localhost:5173';
const ONBOARDING_KEY = 'trabage_onboarding_complete';

const ACCOUNT_TYPE_CASES = [
  {
    id: 'personal',
    label: 'Cuenta Personal',
    expectedField: 'Nombre completo',
  },
  {
    id: 'business',
    label: 'Cuenta Business',
    expectedField: 'Nombre de la cuenta Business',
  },
  {
    id: 'organization',
    label: 'Cuenta de Organización',
    expectedField: 'Nombre de la organización',
  },
];

function loadEnv() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const env = fs.readFileSync(envPath, 'utf8');
  return {
    url: env.match(/^\s*VITE_SUPABASE_URL\s*=\s*(.+)\s*$/m)?.[1]?.trim(),
    anonKey: env.match(/^\s*VITE_SUPABASE_ANON_KEY\s*=\s*(.+)\s*$/m)?.[1]?.trim(),
  };
}

function loadCredentials() {
  const email = process.env.TEST_LOGIN_EMAIL?.trim().toLowerCase();
  const password = process.env.TEST_LOGIN_PASSWORD;

  if (email && password) {
    return [{ email, source: 'env' }];
  }

  const adminsPath = path.join(__dirname, 'admins.local.json');
  if (!fs.existsSync(adminsPath)) return [];

  const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));
  if (!Array.isArray(admins)) return [];

  return admins
    .filter((entry) => entry?.email && entry?.password)
    .map((entry) => ({
      email: String(entry.email).trim().toLowerCase(),
      password: String(entry.password),
      source: 'admins.local.json',
    }));
}

function loadCredentialPassword(cred) {
  if (cred.password) return cred.password;
  return process.env.TEST_LOGIN_PASSWORD ?? '';
}

function record(results, name, status, note = '') {
  results.push({ name, status, note });
  const icon = status === 'pass' ? '✅' : status === 'skip' ? '⏭️' : '❌';
  console.log(`${icon} ${name}${note ? ` — ${note}` : ''}`);
}

async function resetGuestState(context, { onboardingComplete = false } = {}) {
  await context.addInitScript(({ key, complete }) => {
    sessionStorage.clear();
    if (complete) {
      localStorage.setItem(key, 'true');
    } else {
      localStorage.removeItem(key);
    }
  }, { key: ONBOARDING_KEY, complete: onboardingComplete });
}

async function testSplashToOnboarding(page, results) {
  const name = 'Splash → Onboarding (first visit)';
  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForURL(/\/onboarding/, { timeout: 15000 });
    await page.getByRole('button', { name: 'Saltar' }).waitFor({ timeout: 5000 });
    record(results, name, 'pass');
  } catch (err) {
    record(results, name, 'fail', err.message);
  }
}

async function testOnboardingSkip(page, results) {
  const name = 'Onboarding skip → Login';
  try {
    await page.getByRole('button', { name: 'Saltar' }).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await waitForAuthShell(page);
    await page.getByText('Bienvenido', { exact: true }).first().waitFor({ timeout: 15000 });
    record(results, name, 'pass');
  } catch (err) {
    record(results, name, 'fail', err.message);
  }
}

async function waitForAuthShell(page) {
  await page.waitForFunction(
    () => !document.querySelector('[aria-busy="true"]') &&
      !/Cargando|Loading/i.test(document.body?.innerText ?? ''),
    { timeout: 20000 },
  ).catch(() => {});
}

async function testRegisterPageLoads(page, results) {
  const name = 'Register page loads';
  try {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForAuthShell(page);
    await page.getByText('Bienvenido a', { exact: false }).first().waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: /Cuenta Personal/i }).first().waitFor({ timeout: 15000 });
    record(results, name, 'pass');
  } catch (err) {
    record(results, name, 'fail', err.message);
  }
}

async function testRegisterAccountTypes(page, results) {
  for (const accountCase of ACCOUNT_TYPE_CASES) {
    const name = `Register UI — ${accountCase.id}`;
    try {
      await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForAuthShell(page);
      await page.getByRole('button', { name: new RegExp(accountCase.label, 'i') }).first().click();
      await page.getByText(accountCase.expectedField, { exact: true }).waitFor({ timeout: 5000 });
      await page.getByRole('button', { name: 'Continuar con Google' }).waitFor({ timeout: 5000 });
      await page.getByRole('button', { name: 'Crear cuenta' }).waitFor({ timeout: 5000 });
      record(results, name, 'pass');
    } catch (err) {
      record(results, name, 'fail', err.message);
    }
  }
}

async function testLoginPage(page, results) {
  const name = 'Login page loads';
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForAuthShell(page);
    await page.getByText('Bienvenido', { exact: true }).first().waitFor({ timeout: 15000 });
    await page.locator('input[name="trabage-email"]').waitFor({ timeout: 15000 });
    await page.locator('input[name="trabage-password"]').waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: /Iniciar sesión con Google/i }).waitFor({ timeout: 15000 });
    record(results, name, 'pass');
  } catch (err) {
    record(results, name, 'fail', err.message);
  }
}

async function testForgotPasswordPage(page, results) {
  const name = 'Forgot password page loads';
  try {
    await page.goto(`${BASE_URL}/forgot-password`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.getByRole('heading', { name: 'Recuperar contraseña' }).waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'Enviar enlace' }).waitFor({ timeout: 5000 });
    await page.getByRole('link', { name: 'Volver al login' }).waitFor({ timeout: 5000 });
    record(results, name, 'pass');
  } catch (err) {
    record(results, name, 'fail', err.message);
  }
}

async function testForgotPasswordFromLogin(page, results) {
  const name = 'Login → Forgot password link';
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForAuthShell(page);
    await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
    await page.waitForURL(/\/forgot-password/, { timeout: 10000 });
    await page.getByRole('heading', { name: 'Recuperar contraseña' }).waitFor({ timeout: 5000 });
    record(results, name, 'pass');
  } catch (err) {
    record(results, name, 'fail', err.message);
  }
}

async function logoutFromUi(page) {
  const logoutTriggers = [
    page.getByRole('button', { name: 'Cerrar sesión' }),
    page.getByText('Cerrar sesión', { exact: true }),
  ];

  for (const trigger of logoutTriggers) {
    if (await trigger.count()) {
      await trigger.first().click();
      const confirm = page.getByRole('button', { name: 'Sí, cerrar sesión' });
      if (await confirm.count()) {
        await confirm.click();
      }
      await page.waitForURL(/\/login/, { timeout: 15000 });
      return;
    }
  }

  throw new Error('No se encontró control de cerrar sesión');
}

async function testLoginLogout(page, credentials, results) {
  if (!credentials.length) {
    record(results, 'Login + logout (credentials)', 'skip', 'sin TEST_LOGIN_* ni admins.local.json');
    return;
  }

  for (const [index, cred] of credentials.entries()) {
    const name = `Login + logout — ${cred.source}#${index + 1}`;
    try {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForAuthShell(page);
      await page.locator('input[name="trabage-email"]').fill(cred.email);
      await page.locator('input[name="trabage-password"]').fill(loadCredentialPassword(cred));
      await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();

      const leftLogin = page.waitForFunction(
        () => !window.location.pathname.startsWith('/login'),
        { timeout: 20000 },
      );
      const loginError = page.locator('[role="alert"]').first().waitFor({ timeout: 20000 });

      const outcome = await Promise.race([
        leftLogin.then(() => 'ok'),
        loginError.then(() => 'error'),
      ]).catch(() => 'timeout');

      if (outcome === 'error') {
        const message = (await page.locator('[role="alert"]').first().innerText()).trim();
        record(results, name, 'fail', message || 'credenciales inválidas');
        continue;
      }

      if (outcome !== 'ok') {
        record(results, name, 'fail', 'login timeout (sin redirect ni error visible)');
        continue;
      }

      const landedOn = new URL(page.url()).pathname;
      if (landedOn.startsWith('/admin')) {
        await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
      }

      await logoutFromUi(page);
      record(results, name, 'pass', `redirect=${landedOn}`);
    } catch (err) {
      record(results, name, 'fail', err.message);
    }
  }
}

function printManualChecklist() {
  console.log('\n📋 Manual checklist — full auth flow (per account type × 3)\n');
  const steps = [
    'Abrir TrabaGE por primera vez.',
    'Ver Splash Screen.',
    'Ver Onboarding.',
    'Acceder a Login/Registro.',
    'Crear cuenta (Email y Google).',
    'Verificar correo (si aplica).',
    'Entrar al perfil correspondiente.',
    'Completar el perfil.',
    'Cerrar sesión.',
    'Volver a iniciar sesión.',
    'Confirmar que todo sigue igual.',
  ];
  steps.forEach((step, index) => {
    console.log(`  ${index + 1}. ${step}`);
  });
  console.log('\nRepetir para: Cuenta Personal, Cuenta Business, Cuenta de Organización.');
  console.log('Google OAuth y verificación de email requieren credenciales/correo real — no automatizable aquí.\n');
}

async function main() {
  const credentials = loadCredentials();
  const env = loadEnv();
  const results = [];

  console.log(`\n🧪 TrabaGE E2E auth flow — ${BASE_URL}\n`);
  if (env.url) {
    console.log(`Supabase project configured: ${env.url.includes('supabase.co') ? 'yes' : 'check .env.local'}`);
  }
  if (credentials.length) {
    console.log(`Login credentials: ${credentials.length} account(s) from ${credentials[0].source}`);
  } else {
    console.log('Login credentials: none (guest UI tests only)');
  }
  console.log('');

  const browser = await chromium.launch({ headless: true });

  const freshContext = await browser.newContext();
  await resetGuestState(freshContext, { onboardingComplete: false });
  const freshPage = await freshContext.newPage();

  await testSplashToOnboarding(freshPage, results);
  await testOnboardingSkip(freshPage, results);
  await freshContext.close();

  const guestContext = await browser.newContext();
  await resetGuestState(guestContext, { onboardingComplete: true });
  const page = await guestContext.newPage();

  await testRegisterPageLoads(page, results);
  await testRegisterAccountTypes(page, results);
  await testLoginPage(page, results);
  await testForgotPasswordPage(page, results);
  await testForgotPasswordFromLogin(page, results);
  await guestContext.close();

  const loginContext = await browser.newContext();
  await resetGuestState(loginContext, { onboardingComplete: true });
  const loginPage = await loginContext.newPage();
  await testLoginLogout(loginPage, credentials, results);
  await loginContext.close();

  await browser.close();

  const failed = results.filter((r) => r.status === 'fail').length;
  const passed = results.filter((r) => r.status === 'pass').length;
  const skipped = results.filter((r) => r.status === 'skip').length;

  console.log('\n—'.repeat(40));
  console.log(`Automated: ${passed} pass, ${skipped} skip, ${failed} fail (${results.length} total)`);

  printManualChecklist();

  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
