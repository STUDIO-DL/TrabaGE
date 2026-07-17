/**
 * HTTP + DOM smoke audit for TrabaGE (no browser console).
 * Usage: node scripts/audit-routes.mjs [baseUrl]
 */

const BASE = process.argv[2] || 'http://localhost:5175';

const ROUTES = [
  '/',
  '/onboarding',
  '/login',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/explore',
  '/privacy',
  '/terms',
  '/about',
  '/app-info',
  '/manifest.json',
  '/favicon.ico',
  '/icons/trabage-icon-192.png',
  '/icons/apple-touch-icon.png',
  '/OneSignalSDKWorker.js',
  '/personal/feed',
  '/business/feed',
  '/admin',
  '/jobs/nonexistent-id',
  '/profile/00000000-0000-0000-0000-000000000099',
];

const WIDTHS = [320, 360, 375, 390, 412, 768];

async function fetchRoute(path) {
  const url = `${BASE}${path}`;
  const started = Date.now();
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const ms = Date.now() - started;
    const ct = res.headers.get('content-type') || '';
    let body = '';
    if (ct.includes('text/html') || ct.includes('json') || ct.includes('javascript')) {
      body = await res.text();
    } else {
      body = `[binary ${res.headers.get('content-length') || '?'} bytes]`;
    }
    return { path, status: res.status, ms, ct, ok: res.ok, body };
  } catch (err) {
    return { path, status: 0, ms: Date.now() - started, error: err.message };
  }
}

function checkHtml(path, html) {
  const issues = [];
  if (!html.includes('<div id="root">')) issues.push('missing #root mount');
  if (!html.includes('viewport')) issues.push('missing viewport meta');
  if (html.includes('VITE_SUPABASE_URL') || html.includes('service_role')) {
    issues.push('possible secret leak in HTML');
  }
  if (path === '/' && !html.includes('TrabaGE')) issues.push('title/brand missing');
  return issues;
}

async function main() {
  console.log(`\n🔍 TrabaGE route audit — ${BASE}\n`);

  const results = [];
  for (const path of ROUTES) {
    const r = await fetchRoute(path);
    results.push(r);
    const flag = r.status >= 400 || r.error ? '❌' : r.ms > 2000 ? '⚠️' : '✅';
    console.log(`${flag} ${String(r.status).padStart(3)} ${r.ms}ms ${path}${r.error ? ` — ${r.error}` : ''}`);
    if (r.body && typeof r.body === 'string' && r.ct?.includes('html')) {
      const issues = checkHtml(path, r.body);
      issues.forEach((i) => console.log(`    ⚠ ${i}`));
    }
  }

  const failed = results.filter((r) => r.status === 0 || r.status >= 400);
  const slow = results.filter((r) => r.ms > 1500 && r.status < 400);

  console.log('\n--- Summary ---');
  console.log(`Routes tested: ${results.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Slow (>1.5s): ${slow.length}`);

  // Responsive: verify index.html loads at simulated mobile UA
  console.log('\n📱 Mobile UA fetch /login');
  const mobileRes = await fetch(`${BASE}/login`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    },
  });
  console.log(`   status ${mobileRes.status}, ${mobileRes.headers.get('content-type')}`);

  console.log('\nViewport widths to test manually:', WIDTHS.join(', '));
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
