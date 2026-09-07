/**
 * Compare frontend VAPID public key with the Supabase Edge Function secret.
 * Never prints private keys or raw secret values.
 *
 * The Supabase Management API never returns raw secret values — only a
 * SHA-256 digest of each one. So parity is checked by hashing the frontend
 * key locally and comparing that hash to the digest the API returns.
 *
 * Usage:
 *   node scripts/verify-vapid-parity.mjs
 *
 * Requires scripts/supabase-login.cmd (access token in ~/.supabase/access-token.txt)
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'jqzbpdojwzopwuaapqgl';

function loadEnvFile(relativePath) {
  const envPath = path.join(root, relativePath);
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs.readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '').trim()]),
  );
}

function normalizeKey(value) {
  return String(value ?? '').trim();
}

function fingerprint(value) {
  const key = normalizeKey(value);
  if (!key) return '(missing)';
  if (key.length <= 12) return `${key.slice(0, 4)}…${key.slice(-4)} (${key.length} chars)`;
  return `${key.slice(0, 8)}…${key.slice(-8)} (${key.length} chars)`;
}

async function fetchBackendSecrets(token) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/secrets`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Secrets lookup failed: HTTP ${response.status} ${body}`);
  }

  const secrets = await response.json();
  const map = Object.fromEntries(
    (Array.isArray(secrets) ? secrets : []).map((row) => [row.name, row.value ?? row.digest ?? null]),
  );
  return map;
}

const env = loadEnvFile('.env.local');
const frontendKey =
  normalizeKey(env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY) ||
  normalizeKey(env.VITE_FIREBASE_VAPID_KEY);

console.log('VAPID parity check');
console.log('');

console.log(`Frontend VITE_WEB_PUSH_VAPID_PUBLIC_KEY: ${fingerprint(env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY)}`);
if (!env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY && env.VITE_FIREBASE_VAPID_KEY) {
  console.log(`Fallback VITE_FIREBASE_VAPID_KEY: ${fingerprint(env.VITE_FIREBASE_VAPID_KEY)}`);
}
console.log('');

const tokenPath = path.join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.supabase', 'access-token.txt');
if (!fs.existsSync(tokenPath)) {
  console.log('Backend secrets: skipped (no Supabase access token).');
  console.log('Run scripts\\supabase-login.cmd and retry to compare with VAPID_PUBLIC_KEY.');
  process.exit(frontendKey ? 0 : 1);
}

const token = fs.readFileSync(tokenPath, 'utf8').trim();
const secrets = await fetchBackendSecrets(token);
// The Management API returns a SHA-256 digest of each secret, not its raw value.
const backendPublicDigest = normalizeKey(secrets.VAPID_PUBLIC_KEY);
const hasPrivate = Boolean(normalizeKey(secrets.VAPID_PRIVATE_KEY));
const hasSubject = Boolean(normalizeKey(secrets.VAPID_SUBJECT));

console.log(`Backend VAPID_PUBLIC_KEY digest: ${backendPublicDigest || '(missing)'}`);
console.log(`Backend VAPID_PRIVATE_KEY: ${hasPrivate ? 'present' : 'missing'}`);
console.log(`Backend VAPID_SUBJECT: ${hasSubject ? 'present' : 'missing'}`);
console.log('');

if (!frontendKey) {
  console.log('Result: blocked — frontend public key missing.');
  process.exit(1);
}

if (!backendPublicDigest) {
  console.log('Result: blocked — backend VAPID_PUBLIC_KEY secret missing.');
  process.exit(1);
}

if (!hasPrivate || !hasSubject) {
  console.log('Result: blocked — backend VAPID private key or subject missing.');
  process.exit(1);
}

const frontendKeyDigest = crypto.createHash('sha256').update(frontendKey).digest('hex');
if (frontendKeyDigest === backendPublicDigest) {
  console.log('Result: OK — frontend and backend public keys match.');
  process.exit(0);
}

console.log('Result: mismatch — set VITE_WEB_PUSH_VAPID_PUBLIC_KEY equal to Supabase VAPID_PUBLIC_KEY.');
process.exit(1);
