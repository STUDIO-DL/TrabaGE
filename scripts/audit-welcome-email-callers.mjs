/**
 * Static audit: welcome email RPC must only be referenced from
 * ACCOUNT_REGISTRATION_COMPLETED paths (never Google LOGIN / session restore).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '../src');

/** Only registration-completion handlers may queue welcome email. */
const ALLOWED = new Set([
  'services/welcomeEmail.service.js',
  'pages/auth/AuthConfirm.jsx',
  'pages/auth/Register.jsx',
  'pages/auth/AuthCallback.jsx',
]);

const FORBIDDEN_IMPORTS = [
  'welcomeEmail.service',
  'queueWelcomeEmailOnRegistrationComplete',
  'ensureWelcomeEmailQueued',
  'request_welcome_email_if_needed',
];

/** Files that must never import welcome email (login / session / OAuth start). */
const MUST_NOT_REFERENCE = [
  'pages/auth/Login.jsx',
  'services/authFlow.js',
  'context/AuthContext.jsx',
  'components/auth/SocialAuthButtons.jsx',
  'components/auth/GoogleAccountMissingDialog.jsx',
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(js|jsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const violations = [];

for (const file of walk(srcRoot)) {
  const rel = path.relative(srcRoot, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');

  for (const token of FORBIDDEN_IMPORTS) {
    if (!content.includes(token)) continue;
    if (token === 'welcomeEmail.service' && rel === 'services/welcomeEmail.service.js') continue;
    if (ALLOWED.has(rel)) continue;
    violations.push(`${rel}: references ${token}`);
  }
}

for (const rel of MUST_NOT_REFERENCE) {
  const full = path.join(srcRoot, rel);
  if (!fs.existsSync(full)) continue;
  const content = fs.readFileSync(full, 'utf8');
  for (const token of FORBIDDEN_IMPORTS) {
    if (content.includes(token)) {
      violations.push(`${rel}: must not reference ${token}`);
    }
  }
}

const authCallback = fs.readFileSync(path.join(srcRoot, 'pages/auth/AuthCallback.jsx'), 'utf8');
if (
  authCallback.includes('queueWelcomeEmailOnRegistrationComplete') &&
  !authCallback.includes('OAUTH_INTENTS.SIGNUP')
) {
  violations.push('pages/auth/AuthCallback.jsx: welcome email must be gated on SIGNUP intent');
}

// LOGIN rejection path must not queue welcome.
const loginRejectBlock = authCallback.includes('rejectUnregisteredGoogleLogin');
if (loginRejectBlock) {
  const rejectIdx = authCallback.indexOf('rejectUnregisteredGoogleLogin');
  const snippet = authCallback.slice(Math.max(0, rejectIdx - 200), rejectIdx + 400);
  if (snippet.includes('queueWelcomeEmailOnRegistrationComplete')) {
    violations.push(
      'pages/auth/AuthCallback.jsx: welcome email must not run near unregistered Google LOGIN reject',
    );
  }
}

if (violations.length) {
  console.error('❌ Welcome email static audit failed:');
  for (const v of violations) console.error(' -', v);
  process.exit(1);
}

console.log('✅ Welcome email static audit passed');
console.log('Allowed ACCOUNT_REGISTRATION_COMPLETED callers:', [...ALLOWED].join(', '));
console.log('Confirmed: Login / AuthContext / authFlow do not queue welcome email');
