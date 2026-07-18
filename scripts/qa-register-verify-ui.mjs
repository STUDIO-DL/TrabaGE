/**
 * UI registration → verify-email smoke (no service role required).
 * Usage: node scripts/qa-register-verify-ui.mjs [baseUrl]
 */

import { chromium } from 'playwright';

const BASE_URL = process.argv[2] || 'http://localhost:5178';
const ONBOARDING_KEY = 'trabage_onboarding_complete';
const PASSWORD = 'TestPass1!';

const CASES = [
  {
    id: 'personal',
    label: /Cuenta Personal/i,
    fill: async (page) => {
      await page.getByLabel('Nombre completo').fill('UI Test Personal');
    },
  },
  {
    id: 'business',
    label: /Cuenta Business/i,
    fill: async (page) => {
      await page.getByLabel('Nombre de la cuenta Business').fill('UI Test Business');
    },
  },
  {
    id: 'organization',
    label: /Cuenta de Organización/i,
    fill: async (page) => {
      await page.getByLabel('Nombre de la organización').fill('UI Test Org');
      await page.locator('#register-organizationType').selectOption({ index: 1 });
    },
  },
];

function uniqueEmail(prefix) {
  return `ui-${prefix}-${Date.now().toString(36)}@trabage-qa.test`;
}

function record(results, name, status, note = '') {
  results.push({ name, status, note });
  console.log(`${status === 'pass' ? '✅' : '❌'} ${name}${note ? ` — ${note}` : ''}`);
}

async function preparePage(context) {
  await context.addInitScript((key) => {
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem(key, 'true');
  }, ONBOARDING_KEY);
  return context.newPage();
}

async function main() {
  const results = [];
  const browser = await chromium.launch({ headless: true });

  for (const testCase of CASES) {
    const name = `Register UI → verify-email (${testCase.id})`;
    const context = await browser.newContext();
    const page = await preparePage(context);

    try {
      await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.getByRole('button', { name: testCase.label }).first().click();
      await testCase.fill(page);

      const email = uniqueEmail(testCase.id);
      await page.getByLabel(/Correo/i).first().fill(email);
      await page.locator('input[type="password"]').first().fill(PASSWORD);
      await page.locator('input[type="password"]').nth(1).fill(PASSWORD);
      await page.locator('#register-city').selectOption({ index: 1 });
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Crear cuenta' }).click();

      await page.waitForURL(/\/verify-email/, { timeout: 30000 });
      await page.getByText('Verifica tu correo electrónico').waitFor({ timeout: 10000 });
      await page.getByText(email).waitFor({ timeout: 5000 });
      record(results, name, 'pass', email);
    } catch (err) {
      record(results, name, 'fail', err.message);
    } finally {
      await context.close();
    }
  }

  // Auth confirm error recovery UI
  {
    const name = 'Auth confirm expired link UI';
    const context = await browser.newContext();
    const page = await preparePage(context);
    try {
      await page.goto(`${BASE_URL}/auth/confirm?token_hash=invalid&type=email`, {
        waitUntil: 'domcontentloaded',
      });
      await page.getByText(/expirado|inválido|Solicitar nuevo enlace/i).first().waitFor({
        timeout: 20000,
      });
      record(results, name, 'pass');
    } catch (err) {
      record(results, name, 'fail', err.message);
    } finally {
      await context.close();
    }
  }

  // Callback redirects email verification to confirm
  {
    const name = 'Auth callback → confirm redirect';
    const context = await browser.newContext();
    const page = await preparePage(context);
    try {
      await page.goto(`${BASE_URL}/auth/callback?token_hash=invalid&type=email`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForURL(/\/auth\/confirm/, { timeout: 15000 });
      record(results, name, 'pass');
    } catch (err) {
      record(results, name, 'fail', err.message);
    } finally {
      await context.close();
    }
  }

  await browser.close();

  const failed = results.filter((r) => r.status === 'fail').length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
