/**
 * Browser audit for TrabaGE — console, network, screenshots.
 * Usage: node scripts/audit-browser.mjs [baseUrl]
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:5175';
const OUT = path.join(__dirname, '..', 'audit-output');
const VIEWPORTS = [
  { name: '320', width: 320, height: 640 },
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
];

const GUEST_ROUTES = [
  { path: '/', label: 'splash' },
  { path: '/onboarding', label: 'onboarding' },
  { path: '/login', label: 'login' },
  { path: '/register', label: 'register' },
  { path: '/forgot-password', label: 'forgot-password' },
  { path: '/explore', label: 'explore' },
  { path: '/privacy', label: 'privacy' },
  { path: '/terms', label: 'terms' },
];

const PREVIEW_FLOWS = [
  { path: '/explore', action: 'preview-personal', role: 'personal' },
  { path: '/personal/feed', label: 'personal-feed' },
  { path: '/personal/jobs', label: 'personal-jobs' },
  { path: '/business/feed', label: 'business-feed-preview' },
];

function isNoise(text) {
  return (
    text.includes('Download the React DevTools') ||
    text.includes('[vite]') ||
    text.includes('OneSignal') && text.includes('already initialized') ||
    text.includes('Failed to load resource') && text.includes('favicon')
  );
}

function classifyNetwork(url, status) {
  if (status >= 500) return '500';
  if (status === 404) return '404';
  if (status === 401) return '401';
  if (status === 403) return '403';
  if (status === 0) return 'failed';
  return null;
}

async function launchBrowser() {
  const opts = { headless: true };
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ ...opts, channel });
    } catch {
      /* try next */
    }
  }
  return chromium.launch(opts);
}

async function auditRoute(page, routePath, label, viewport) {
  const consoleLogs = [];
  const networkFails = [];

  const onConsole = (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      const text = msg.text();
      if (!isNoise(text)) consoleLogs.push({ type, text });
    }
  };

  const onResponse = (res) => {
    const status = res.status();
    const kind = classifyNetwork(res.url(), status);
    if (kind && !res.url().includes('hot-update')) {
      networkFails.push({ kind, status, url: res.url() });
    }
  };

  const onRequestFailed = (req) => {
    networkFails.push({
      kind: 'failed',
      status: 0,
      url: req.url(),
      error: req.failure()?.errorText,
    });
  };

  page.on('console', onConsole);
  page.on('response', onResponse);
  page.on('requestfailed', onRequestFailed);

  const url = `${BASE}${routePath}`;
  let navError = null;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(1500);
  } catch (err) {
    navError = err.message;
  }

  const shotDir = path.join(OUT, 'screenshots', viewport.name);
  fs.mkdirSync(shotDir, { recursive: true });
  const shotPath = path.join(shotDir, `${label}.png`);
  await page.screenshot({ path: shotPath, fullPage: false }).catch(() => {});

  page.off('console', onConsole);
  page.off('response', onResponse);
  page.off('requestfailed', onRequestFailed);

  return { routePath, label, viewport: viewport.name, navError, consoleLogs, networkFails, shotPath };
}

async function runPreviewFlow(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${BASE}/explore`, { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForTimeout(800);

  const personalBtn = page.getByRole('button', { name: /cuenta personal/i });
  if (await personalBtn.count()) {
    await personalBtn.first().click();
    await page.waitForTimeout(2000);
  }

  const results = [];
  for (const step of ['/personal/feed', '/personal/jobs', '/login']) {
    const label = step.replace(/\//g, '_').slice(1) || 'root';
    results.push(await auditRoute(page, step, `preview-${label}`, viewport));
  }
  return results;
}

async function checkAccessibility(page) {
  const issues = [];
  const inputs = await page.locator('input:not([type="hidden"])').all();
  for (const input of inputs.slice(0, 15)) {
    const id = await input.getAttribute('id');
    const ariaLabel = await input.getAttribute('aria-label');
    const placeholder = await input.getAttribute('placeholder');
    if (!id && !ariaLabel && !placeholder) {
      issues.push('input without label/id/placeholder');
      break;
    }
  }
  const nav = page.locator('nav').first();
  if ((await nav.count()) && !(await nav.getAttribute('aria-label'))) {
    issues.push('nav missing aria-label');
  }
  return issues;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log(`\n🌐 TrabaGE browser audit — ${BASE}\n`);

  const browser = await launchBrowser();
  const context = await browser.newContext({ locale: 'es-ES' });
  const allResults = [];

  for (const vp of VIEWPORTS) {
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    console.log(`\n📐 Viewport ${vp.name}px`);

    for (const { path: routePath, label } of GUEST_ROUTES) {
      const r = await auditRoute(page, routePath, label, vp);
      allResults.push(r);
      const errs = r.consoleLogs.filter((l) => l.type === 'error').length;
      const warns = r.consoleLogs.filter((l) => l.type === 'warning').length;
      const net = r.networkFails.length;
      const flag = r.navError || errs ? '❌' : net || warns ? '⚠️' : '✅';
      console.log(`  ${flag} ${routePath} — console e:${errs} w:${warns} net:${net}`);
      if (r.navError) console.log(`      nav: ${r.navError}`);
      r.consoleLogs.slice(0, 3).forEach((l) => console.log(`      [${l.type}] ${l.text.slice(0, 120)}`));
      r.networkFails.slice(0, 3).forEach((n) => console.log(`      [${n.kind}] ${n.status} ${n.url.slice(0, 80)}`));
    }

    if (vp.name === '375') {
      const previewResults = await runPreviewFlow(page, vp);
      allResults.push(...previewResults);
      console.log(`  ✅ preview flow (${previewResults.length} steps)`);
      const a11y = await checkAccessibility(page);
      if (a11y.length) console.log(`  ⚠️ a11y: ${a11y.join(', ')}`);
    }

    await page.close();
  }

  // Protected routes without auth — should redirect to login
  const page = await context.newPage();
  await page.setViewportSize({ width: 375, height: 812 });
  for (const p of ['/admin', '/personal/applications', '/business/dashboard']) {
    await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1000);
    const finalUrl = page.url();
    const ok = finalUrl.includes('/login') || finalUrl.includes('/explore');
    console.log(`\n🔒 ${p} → ${finalUrl.replace(BASE, '')} ${ok ? '✅' : '❌'}`);
  }
  await page.close();

  await browser.close();

  const report = {
    base: BASE,
    timestamp: new Date().toISOString(),
    results: allResults,
    summary: {
      routes: allResults.length,
      navErrors: allResults.filter((r) => r.navError).length,
      consoleErrors: allResults.reduce(
        (n, r) => n + r.consoleLogs.filter((l) => l.type === 'error').length,
        0,
      ),
      consoleWarnings: allResults.reduce(
        (n, r) => n + r.consoleLogs.filter((l) => l.type === 'warning').length,
        0,
      ),
      networkIssues: allResults.reduce((n, r) => n + r.networkFails.length, 0),
    },
  };

  const reportPath = path.join(OUT, 'browser-audit.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n--- Summary ---`);
  console.log(`Routes audited: ${report.summary.routes}`);
  console.log(`Nav errors: ${report.summary.navErrors}`);
  console.log(`Console errors: ${report.summary.consoleErrors}`);
  console.log(`Console warnings: ${report.summary.consoleWarnings}`);
  console.log(`Network issues: ${report.summary.networkIssues}`);
  console.log(`Report: ${reportPath}`);
  console.log(`Screenshots: ${path.join(OUT, 'screenshots')}`);
}

main().catch((err) => {
  console.error('Audit failed:', err.message);
  process.exit(1);
});
