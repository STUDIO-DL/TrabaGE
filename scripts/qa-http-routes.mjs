/**
 * Verifica rutas públicas vía HTTP (sin Playwright).
 * Uso: node scripts/qa-http-routes.mjs [baseUrl]
 */

const BASE_URL = process.argv[2] || 'http://localhost:5176';

const ROUTES = [
  '/',
  '/onboarding',
  '/login',
  '/register',
  '/explore',
  '/privacy',
  '/terms',
  '/about',
  '/app-info',
  '/forgot-password',
  '/verify-email',
  '/search',
  '/personal/feed',
  '/business/feed',
  '/organization/feed',
];

async function checkRoute(path) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { redirect: 'follow' });
    const html = await res.text();
    const broken = [
      /Unexpected Application Error/i,
      /No se pudo cargar esta pantalla/i,
      /Nombre no especificado/i,
    ].some((p) => p.test(html));

    return {
      path,
      status: res.status,
      ok: res.ok && !broken,
      title: html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? '',
      hasRoot: html.includes('id="root"'),
      broken,
    };
  } catch (err) {
    return { path, status: 0, ok: false, error: err.message };
  }
}

async function main() {
  console.log(`\n🧪 TrabaGE HTTP route check — ${BASE_URL}\n`);
  const results = [];
  for (const path of ROUTES) {
    const result = await checkRoute(path);
    results.push(result);
    const icon = result.ok ? '✅' : '❌';
    const detail = result.error || (result.broken ? 'broken pattern' : `HTTP ${result.status}`);
    console.log(`${icon} ${path.padEnd(22)} ${detail}`);
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} rutas OK\n`);
  if (failed) process.exitCode = 1;
}

main();
