/**
 * Smoke-test de rutas públicas y pantallas guest de TrabaGE.
 * Uso: node scripts/qa-smoke-routes.mjs [baseUrl]
 */

import { chromium } from 'playwright';

const BASE_URL = process.argv[2] || 'http://localhost:5176';

const PUBLIC_ROUTES = [
  { path: '/', name: 'Splash' },
  { path: '/onboarding', name: 'Onboarding' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/explore', name: 'Explore' },
  { path: '/privacy', name: 'Privacidad' },
  { path: '/terms', name: 'Términos' },
  { path: '/about', name: 'About' },
  { path: '/app-info', name: 'App Info' },
  { path: '/forgot-password', name: 'Forgot Password' },
];

const CONSOLE_IGNORE = [
  /Download the React DevTools/,
  /Failed to load resource.*favicon/,
  /OneSignal/,
  /Sentry/,
  /Manifest/,
  /service worker/,
  /workbox/,
];

function shouldIgnoreConsole(text) {
  return CONSOLE_IGNORE.some((pattern) => pattern.test(text));
}

async function auditRoute(page, route) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  const onConsole = (msg) => {
    if (msg.type() === 'error' && !shouldIgnoreConsole(msg.text())) {
      consoleErrors.push(msg.text());
    }
  };
  const onPageError = (err) => pageErrors.push(String(err));
  const onRequestFailed = (req) => {
    const url = req.url();
    if (url.includes('localhost') || url.includes('supabase') || url.includes('trabage')) {
      failedRequests.push(`${req.failure()?.errorText || 'failed'} ${url}`);
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);

  let status = 'ok';
  let note = '';

  try {
    const response = await page.goto(`${BASE_URL}${route.path}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await page.waitForTimeout(1500);

    const httpStatus = response?.status() ?? 0;
    const bodyText = await page.locator('body').innerText();
    const brokenPatterns = [
      /No se pudo cargar esta pantalla/i,
      /Nombre no especificado/i,
      /Something went wrong/i,
      /Unexpected Application Error/i,
    ];

    if (httpStatus >= 500) {
      status = 'fail';
      note = `HTTP ${httpStatus}`;
    } else if (brokenPatterns.some((p) => p.test(bodyText))) {
      status = 'fail';
      note = 'Broken UI pattern detected';
    } else if (pageErrors.length) {
      status = 'fail';
      note = pageErrors[0];
    } else if (consoleErrors.length) {
      status = 'warn';
      note = consoleErrors[0];
    }
  } catch (err) {
    status = 'fail';
    note = err.message;
  } finally {
    page.removeListener('console', onConsole);
    page.removeListener('pageerror', onPageError);
    page.removeListener('requestfailed', onRequestFailed);
  }

  return { ...route, status, note, consoleErrors, pageErrors, failedRequests };
}

async function main() {
  console.log(`\n🧪 TrabaGE QA smoke — ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];
  for (const route of PUBLIC_ROUTES) {
    const result = await auditRoute(page, route);
    results.push(result);
    const icon = result.status === 'ok' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
    console.log(`${icon} ${route.name.padEnd(18)} ${route.path}${result.note ? ` — ${result.note}` : ''}`);
  }

  await browser.close();

  const failed = results.filter((r) => r.status === 'fail').length;
  const warned = results.filter((r) => r.status === 'warn').length;

  console.log('\n—'.repeat(40));
  console.log(`Rutas OK: ${results.length - failed - warned}/${results.length}`);
  if (warned) console.log(`Advertencias: ${warned}`);
  if (failed) {
    console.log(`Fallos: ${failed}`);
    process.exitCode = 1;
  }
  console.log('');
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
