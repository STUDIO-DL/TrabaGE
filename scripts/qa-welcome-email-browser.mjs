/**
 * Browser QA: session restore / refresh / login must NOT invoke welcome email RPC.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

function loadCredentials() {
  const email = process.env.TEST_LOGIN_EMAIL?.trim().toLowerCase();
  const password = process.env.TEST_LOGIN_PASSWORD;
  if (email && password) return { email, password };

  const adminsPath = path.join(__dirname, 'admins.local.json');
  if (!fs.existsSync(adminsPath)) return null;
  const entry = JSON.parse(fs.readFileSync(adminsPath, 'utf8'))[0];
  return { email: entry.email.trim().toLowerCase(), password: entry.password };
}

function trackWelcomeRpc(page) {
  const calls = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('request_welcome_email_if_needed') || url.includes('/rpc/request_welcome_email')) {
      calls.push(url);
    }
  });
  return calls;
}

async function main() {
  const creds = loadCredentials();
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const rpcCalls = trackWelcomeRpc(page);

  console.log('Case 4: open app (cold load)');
  await page.addInitScript(() => {
    localStorage.setItem('trabage_onboarding_complete', 'true');
  });
  await page.goto(`${APP_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#login-email', { timeout: 60000 });

  console.log('Case 3: page refresh');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#login-email', { timeout: 60000 });

  console.log('Case 4b: new browser context (reopen)');
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.addInitScript(() => {
    localStorage.setItem('trabage_onboarding_complete', 'true');
  });
  const rpcCalls2 = trackWelcomeRpc(page2);
  await page2.goto(`${APP_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page2.waitForTimeout(2000);

  let loginRpcDelta = 0;
  if (creds) {
    console.log('Case 2: email login');
    const before = rpcCalls.length;
    await page.fill('#login-email', creds.email);
    await page.fill('#login-password', creds.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    loginRpcDelta = rpcCalls.length - before;
    console.log('RPC calls during login attempt:', loginRpcDelta);
  } else {
    console.log('Skipping login — set TEST_LOGIN_EMAIL/PASSWORD');
  }

  await browser.close();

  const total = rpcCalls.length + rpcCalls2.length;
  console.log('');
  console.log('RPC on login page load+refresh:', rpcCalls.length);
  console.log('RPC on new context home load:', rpcCalls2.length);
  console.log('Total:', total);

  if (total > 0 || loginRpcDelta > 0) {
    console.error('❌ FAIL: welcome email RPC observed');
    process.exit(1);
  }

  console.log('✅ PASS: no welcome email RPC on refresh, reopen, or login');
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});
