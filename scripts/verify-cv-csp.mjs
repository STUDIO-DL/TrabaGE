import fs from 'node:fs';

const toml = fs.readFileSync('netlify.toml', 'utf8');
const match = toml.match(/Content-Security-Policy = "([^"]+)"/);
if (!match) {
  console.error('NO CSP');
  process.exit(1);
}

const csp = match[1];
const checks = [
  ['wasm-unsafe-eval present', csp.includes("'wasm-unsafe-eval'")],
  ['full unsafe-eval NOT present', !csp.includes("'unsafe-eval'")],
  ['OneSignal CDN kept', csp.includes('https://cdn.onesignal.com')],
  ['connect-src allows data:', /connect-src[^;]*\bdata:/.test(csp)],
  ['frame-src allows blob:', /frame-src[^;]*\bblob:/.test(csp)],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(ok ? 'OK' : 'FAIL', name);
  if (!ok) failed = true;
}

console.log(
  'fonts',
  fs.existsSync('public/fonts/Inter-Regular.woff2') &&
    fs.existsSync('public/fonts/Inter-SemiBold.woff2')
    ? 'OK'
    : 'MISSING',
);

process.exit(failed ? 1 : 0);
