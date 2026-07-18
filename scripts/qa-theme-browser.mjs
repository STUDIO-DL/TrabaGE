/**
 * Dark mode + public-route light forcing QA.
 * Usage: node scripts/qa-theme-browser.mjs [baseUrl]
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.argv[2] || 'http://localhost:5180';
const ONBOARDING_KEY = 'trabage_onboarding_complete';
const THEME_KEY = 'trabage_theme';

const PUBLIC_AUTH_ROUTES = [
  '/',
  '/onboarding',
  '/login',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/auth/callback',
  '/auth/confirm',
];

function isPublicAuthRoute(pathname) {
  if (!pathname) return false;
  return PUBLIC_AUTH_ROUTES.some(
    (route) => pathname === route || (route !== '/' && pathname.startsWith(`${route}/`)),
  );
}

const PUBLIC_PAGES = [
  { path: '/', label: 'Splash' },
  { path: '/onboarding', label: 'Onboarding' },
  { path: '/login', label: 'Login' },
  { path: '/register', label: 'Register' },
  { path: '/forgot-password', label: 'Forgot Password' },
  { path: '/verify-email', label: 'Verify Email' },
];

function record(results, name, status, note = '') {
  results.push({ name, status, note });
  const icon = status === 'pass' ? '✅' : status === 'skip' ? '⏭️' : '❌';
  console.log(`${icon} ${name}${note ? ` — ${note}` : ''}`);
}

async function readThemeState(page) {
  return page.evaluate(() => ({
    isDark: document.documentElement.classList.contains('dark'),
    datasetTheme: document.documentElement.dataset.theme,
    forcedLight: document.documentElement.dataset.forcedLight,
    bg: getComputedStyle(document.documentElement).getPropertyValue('--app-bg').trim(),
    storedTheme: localStorage.getItem('trabage_theme'),
  }));
}

async function main() {
  const results = [];

  // Static route matcher
  for (const route of PUBLIC_AUTH_ROUTES) {
    const ok = isPublicAuthRoute(route);
    record(results, `isPublicAuthRoute(${route})`, ok ? 'pass' : 'fail');
  }
  record(
    results,
    'isPublicAuthRoute(/personal/feed) false',
    !isPublicAuthRoute('/personal/feed') ? 'pass' : 'fail',
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript(
    ({ onboardingKey, themeKey }) => {
      sessionStorage.clear();
      localStorage.clear();
      localStorage.setItem(onboardingKey, 'true');
      localStorage.setItem(themeKey, 'dark');
    },
    { onboardingKey: ONBOARDING_KEY, themeKey: THEME_KEY },
  );

  const page = await context.newPage();

  for (const { path, label } of PUBLIC_PAGES) {
    try {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(400);
      const state = await readThemeState(page);
      const pass =
        state.storedTheme === 'dark' &&
        !state.isDark &&
        state.datasetTheme === 'light' &&
        state.forcedLight === 'true';
      record(
        results,
        `${label} forced light with dark preference`,
        pass ? 'pass' : 'fail',
        pass ? '' : JSON.stringify(state),
      );
    } catch (error) {
      record(results, `${label} forced light with dark preference`, 'fail', error.message);
    }
  }

  // Non-public route while logged out should honor stored dark preference
  try {
    await page.goto(`${BASE_URL}/explore`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(400);
    const state = await readThemeState(page);
    const pass = state.isDark && state.datasetTheme === 'dark' && state.forcedLight === 'false';
    record(
      results,
      'Explore honors stored dark preference when logged out',
      pass ? 'pass' : 'fail',
      pass ? '' : JSON.stringify(state),
    );
  } catch (error) {
    record(results, 'Explore honors stored dark preference when logged out', 'fail', error.message);
  }

  // Dark token sanity on explore
  try {
    const darkBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--app-bg').trim(),
    );
    record(
      results,
      'Dark mode uses near-black bg token',
      darkBg === '9 9 11' ? 'pass' : 'fail',
      `bg=${darkBg}`,
    );
  } catch (error) {
    record(results, 'Dark mode uses near-black bg token', 'fail', error.message);
  }

  // Login restores dark preference after forced-light public routes
  await browser.close();

  const creds = loadCredentials();
  if (!creds.length) {
    record(results, 'Login restores dark after logout to login', 'skip', 'no credentials');
  } else {
    const loginBrowser = await chromium.launch({ headless: true });
    const loginContext = await loginBrowser.newContext();
    await loginContext.addInitScript(
      ({ onboardingKey, themeKey }) => {
        sessionStorage.clear();
        localStorage.clear();
        localStorage.setItem(onboardingKey, 'true');
        localStorage.setItem(themeKey, 'dark');
      },
      { onboardingKey: ONBOARDING_KEY, themeKey: THEME_KEY },
    );
    const loginPage = await loginContext.newPage();

    try {
      const cred = creds[0];
      await loginPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
      let preLogin = await readThemeState(loginPage);
      if (!preLogin.isDark && preLogin.forcedLight === 'true') {
        record(results, 'Pre-login login page forced light', 'pass');
      } else {
        record(results, 'Pre-login login page forced light', 'fail', JSON.stringify(preLogin));
      }

      await loginPage.locator('input[name="trabage-email"]').fill(cred.email);
      await loginPage.locator('input[name="trabage-password"]').fill(cred.password);
      await loginPage.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
      await loginPage.waitForFunction(() => !window.location.pathname.startsWith('/login'), {
        timeout: 25000,
      });
      await loginPage.waitForTimeout(800);

      const postLogin = await readThemeState(loginPage);
      if (postLogin.isDark && postLogin.datasetTheme === 'dark' && postLogin.forcedLight === 'false') {
        record(results, 'Post-login dark preference restored', 'pass');
      } else {
        record(results, 'Post-login dark preference restored', 'fail', JSON.stringify(postLogin));
      }

      await loginPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
      await loginPage.evaluate(() => {
        const theme = localStorage.getItem('trabage_theme');
        const onboarding = localStorage.getItem('trabage_onboarding_complete');
        localStorage.clear();
        sessionStorage.clear();
        if (theme) localStorage.setItem('trabage_theme', theme);
        if (onboarding) localStorage.setItem('trabage_onboarding_complete', onboarding);
      });
      await loginPage.context().clearCookies();
      await loginPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
      await loginPage.waitForTimeout(800);
      const postLogout = await readThemeState(loginPage);
      if (!postLogout.isDark && postLogout.forcedLight === 'true') {
        record(results, 'Post-logout login forced light again', 'pass');
      } else {
        record(results, 'Post-logout login forced light again', 'fail', JSON.stringify(postLogout));
      }
    } catch (error) {
      record(results, 'Login/logout dark preference cycle', 'fail', error.message);
    }

    await loginBrowser.close();
  }

  const failed = results.filter((r) => r.status === 'fail');
  console.log('\n--- Summary ---');
  console.log(`Total: ${results.length} | Pass: ${results.filter((r) => r.status === 'pass').length} | Fail: ${failed.length}`);

  if (failed.length) {
    process.exitCode = 1;
  }
}

function loadCredentials() {
  const email = process.env.TEST_LOGIN_EMAIL?.trim().toLowerCase();
  const password = process.env.TEST_LOGIN_PASSWORD;
  if (email && password) return [{ email, password, source: 'env' }];

  const adminsPath = path.join(__dirname, 'admins.local.json');
  if (!fs.existsSync(adminsPath)) return [];

  const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));
  return admins
    .filter((entry) => entry?.email && entry?.password)
    .map((entry) => ({
      email: String(entry.email).trim().toLowerCase(),
      password: String(entry.password),
      source: 'admins.local.json',
    }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
