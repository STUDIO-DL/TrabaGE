/**
 * Admin panel smoke tests (route guards + page load).
 * Usage: node scripts/qa-admin-panel.mjs [baseUrl]
 */

import { chromium } from 'playwright';

const BASE_URL = process.argv[2] || 'http://localhost:5174';

const ADMIN_ROUTES = [
  '/admin',
  '/admin/users',
  '/admin/companies',
  '/admin/organizations',
  '/admin/verifications',
  '/admin/profile',
];

async function testGuestRedirect(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
  const url = page.url();
  const redirectedToLogin = url.includes('/login');
  return { path, url, pass: redirectedToLogin };
}

async function testAdminPagesLoad(page) {
  // Without credentials we can only verify guest redirect.
  // With env ADMIN_EMAIL/ADMIN_PASSWORD, attempt login and page checks.
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    return { skipped: true, reason: 'ADMIN_EMAIL/ADMIN_PASSWORD not set' };
  }

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  const results = [];
  for (const path of ADMIN_ROUTES) {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
    const url = page.url();
    const onAdmin = url.includes(path) || url.endsWith('/admin');
    const hasContent = await page.locator('main, h1').count();
    results.push({ path, url, pass: onAdmin && hasContent > 0 });
  }
  return { skipped: false, results };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = { guestRedirects: [], authenticated: null, buildOk: true };

  console.log(`Testing admin panel at ${BASE_URL}\n`);

  for (const path of ADMIN_ROUTES) {
    const result = await testGuestRedirect(page, path);
    results.guestRedirects.push(result);
    console.log(`${result.pass ? '✓' : '✗'} Guest ${path} → ${result.url}`);
  }

  results.authenticated = await testAdminPagesLoad(page);
  if (results.authenticated.skipped) {
    console.log(`\n○ Authenticated tests skipped: ${results.authenticated.reason}`);
  } else {
    for (const r of results.authenticated.results) {
      console.log(`${r.pass ? '✓' : '✗'} Admin ${r.path}`);
    }
  }

  await browser.close();

  const guestPass = results.guestRedirects.every((r) => r.pass);
  const authPass = results.authenticated.skipped || results.authenticated.results?.every((r) => r.pass);
  const allPass = guestPass && authPass;

  console.log(`\n${allPass ? 'PASS' : 'FAIL'}: Admin smoke tests`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
