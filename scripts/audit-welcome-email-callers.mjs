/**
 * Static audit: welcome email RPC must only be referenced from registration completion paths.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '../src');

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

if (fs.readFileSync(path.join(srcRoot, 'services/authFlow.js'), 'utf8').includes('welcomeEmail')) {
  violations.push('services/authFlow.js: must not import welcome email service');
}

if (violations.length) {
  console.error('❌ Welcome email static audit failed:');
  for (const v of violations) console.error(' -', v);
  process.exit(1);
}

console.log('✅ Welcome email static audit passed');
console.log('Allowed callers:', [...ALLOWED].join(', '));
