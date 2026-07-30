/**
 * Verifies Descubrir personas eligibility + ranking logic (offline).
 * Reproduces the empty-list bug caused by the legacy setup_complete gate.
 */
import assert from 'node:assert/strict';
import {
  filterDiscoverPool,
  isEligibleUnderLegacySetupCompleteGate,
  isDiscoverPeopleEligible,
  rankDiscoverPeople,
  scoreDiscoverPerson,
} from '../src/utils/discoverPeopleEligibility.js';

const viewerId = 'me';

const fixtures = [
  {
    user_id: 'a',
    full_name: 'Ana López',
    setup_complete: false,
    is_active: true,
    sector: 'Tecnología',
    city: 'Malabo',
    country: 'Guinea Ecuatorial',
    headline: 'Desarrolladora',
  },
  {
    user_id: 'b',
    full_name: 'Boris Nsue',
    setup_complete: true,
    is_active: true,
    sector: 'Salud',
    city: 'Bata',
    country: 'Guinea Ecuatorial',
  },
  {
    user_id: 'c',
    full_name: 'Carla',
    setup_complete: false,
    is_active: true,
    sector: 'Tecnología',
    city: 'Malabo',
  },
  {
    user_id: viewerId,
    full_name: 'Yo',
    setup_complete: true,
    is_active: true,
    sector: 'Tecnología',
  },
  {
    user_id: 'inactive',
    full_name: 'Inactivo',
    setup_complete: true,
    is_active: false,
  },
  {
    user_id: 'noname',
    full_name: '   ',
    setup_complete: true,
    is_active: true,
  },
];

const ctx = { viewerId, followedIds: new Set(['c']), role: 'personal' };

// Case: legacy gate empties nearly everyone who only finished bootstrap.
const legacy = filterDiscoverPool(fixtures, ctx, { requireSetupComplete: true });
assert.equal(legacy.kept.length, 1, 'legacy gate should keep only setup_complete=true (Boris)');
assert.equal(legacy.kept[0].user_id, 'b');

const legacyAna = isEligibleUnderLegacySetupCompleteGate(fixtures[0], ctx);
assert.equal(legacyAna.ok, false);
assert.equal(legacyAna.reason, 'setup_complete_false');

// Case: fixed gate keeps bootstrapped users with names.
const fixed = filterDiscoverPool(fixtures, ctx, { requireSetupComplete: false });
assert.deepEqual(
  fixed.kept.map((p) => p.user_id).sort(),
  ['a', 'b'],
  'fixed gate should keep Ana + Boris (Carla followed, self/inactive/empty excluded)',
);

assert.equal(isDiscoverPeopleEligible(fixtures[0], ctx).ok, true);

// Case: user without sector still gets ranked people (fallback score 0+country/city).
const rankedNoSector = rankDiscoverPeople(fixtures, { country: 'Guinea Ecuatorial' }, ctx);
assert.ok(rankedNoSector.length >= 2);
assert.ok(rankedNoSector.every((p) => p.user_id !== viewerId));

// Case: sector match scores higher.
const scoredSame = scoreDiscoverPerson(fixtures[0], {
  sector: 'Tecnología',
  city: 'Malabo',
});
const scoredOther = scoreDiscoverPerson(fixtures[1], {
  sector: 'Tecnología',
  city: 'Malabo',
});
assert.ok(scoredSame > scoredOther, 'same sector+city should outrank unrelated');

const ranked = rankDiscoverPeople(
  fixtures,
  { sector: 'Tecnología', city: 'Malabo', country: 'Guinea Ecuatorial' },
  ctx,
);
assert.equal(ranked[0].user_id, 'a', 'Ana should rank first for same sector+city');

console.log(
  JSON.stringify(
    {
      ok: true,
      reproducedLegacyEmptyBug: legacy.kept.length < fixed.kept.length,
      legacyCount: legacy.kept.length,
      fixedCount: fixed.kept.length,
      legacyExcluded: legacy.excluded,
      fixedExcluded: fixed.excluded,
      topRanked: ranked.map((p) => ({ id: p.user_id, score: p.relevance_score })),
    },
    null,
    2,
  ),
);
