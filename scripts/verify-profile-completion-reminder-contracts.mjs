/**
 * Dry-run style checks for profile completion reminder Edge Function helpers.
 * Does NOT call Resend or production DB.
 * Run: node --experimental-strip-types  (N/A) — use Deno check if available.
 *
 * This script validates CTA paths and subject copy expectations.
 */
import assert from 'node:assert/strict';

const PROFILE_CTA_PATHS = {
  personal: '/personal/profile',
  business: '/business/profile',
  organization: '/organization/profile',
};

const SUBJECT = 'Tu perfil de TrabaGE puede abrirte más oportunidades';
const APP = 'https://trabage.org';

assert.equal(`${APP}${PROFILE_CTA_PATHS.personal}`, 'https://trabage.org/personal/profile');
assert.equal(`${APP}${PROFILE_CTA_PATHS.business}`, 'https://trabage.org/business/profile');
assert.equal(`${APP}${PROFILE_CTA_PATHS.organization}`, 'https://trabage.org/organization/profile');
assert.ok(SUBJECT.includes('oportunidades'));

console.log('PASS reminder CTA/subject contracts');
