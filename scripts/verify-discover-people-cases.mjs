/**
 * Extended case matrix for Descubrir personas (offline reproduction of empty-list bug + fix).
 */
import assert from 'node:assert/strict';
import {
  filterDiscoverPool,
  rankDiscoverPeople,
  scoreDiscoverPerson,
} from '../src/utils/discoverPeopleEligibility.js';

const me = 'viewer';

function people(extra = []) {
  return [
    {
      user_id: 'p1',
      full_name: 'Persona Sector',
      setup_complete: false,
      is_active: true,
      sector: 'Tecnología',
      city: 'Malabo',
      country: 'Guinea Ecuatorial',
      headline: 'Ingeniera',
    },
    {
      user_id: 'p2',
      full_name: 'Persona País',
      setup_complete: false,
      is_active: true,
      sector: 'Educación',
      city: 'Bata',
      country: 'Guinea Ecuatorial',
    },
    {
      user_id: 'p3',
      full_name: 'Persona Activa',
      setup_complete: true,
      is_active: true,
      sector: 'Comercio',
      city: 'Ebebiyín',
      country: 'España',
    },
    {
      user_id: me,
      full_name: 'Viewer',
      setup_complete: true,
      is_active: true,
      sector: 'Tecnología',
      city: 'Malabo',
      country: 'Guinea Ecuatorial',
    },
    ...extra,
  ];
}

const results = {};

// Case 1: viewer with sector → sector peers first
{
  const ranked = rankDiscoverPeople(people(), { sector: 'Tecnología', city: 'Malabo' }, {
    viewerId: me,
    followedIds: new Set(),
    role: 'personal',
  });
  assert.equal(ranked[0].user_id, 'p1');
  results.case1_sector = { ok: true, top: ranked[0].user_id, count: ranked.length };
}

// Case 2: viewer without sector → still gets people
{
  const ranked = rankDiscoverPeople(people(), {}, {
    viewerId: me,
    followedIds: new Set(),
    role: 'personal',
  });
  assert.ok(ranked.length >= 3);
  results.case2_no_sector = { ok: true, count: ranked.length };
}

// Case 3: few matches → fallback to others
{
  const ranked = rankDiscoverPeople(people(), { sector: 'SectorInexistente' }, {
    viewerId: me,
    followedIds: new Set(),
    role: 'personal',
  });
  assert.ok(ranked.length >= 3);
  assert.ok(ranked.every((p) => p.relevance_score >= 0));
  results.case3_fallback = { ok: true, count: ranked.length };
}

// Case 4: already following several → still show others
{
  const ranked = rankDiscoverPeople(people(), { sector: 'Tecnología' }, {
    viewerId: me,
    followedIds: new Set(['p1', 'p2']),
    role: 'personal',
  });
  assert.deepEqual(ranked.map((p) => p.user_id), ['p3']);
  results.case4_following = { ok: true, remaining: ranked.map((p) => p.user_id) };
}

// Case 5: incomplete setup_complete still discoverable
{
  const legacy = filterDiscoverPool(people(), { viewerId: me, followedIds: new Set(), role: 'personal' }, {
    requireSetupComplete: true,
  });
  const fixed = filterDiscoverPool(people(), { viewerId: me, followedIds: new Set(), role: 'personal' }, {
    requireSetupComplete: false,
  });
  assert.ok(legacy.kept.length < fixed.kept.length);
  results.case5_incomplete = {
    ok: true,
    legacyCount: legacy.kept.length,
    fixedCount: fixed.kept.length,
    reproducedEmptyBug: legacy.kept.length < fixed.kept.length,
  };
}

// Case 6: no city on viewer
{
  const ranked = rankDiscoverPeople(people(), { sector: 'Tecnología' }, {
    viewerId: me,
    followedIds: new Set(),
    role: 'personal',
  });
  assert.ok(ranked.length >= 1);
  assert.equal(ranked[0].user_id, 'p1');
  results.case6_no_city = { ok: true, top: ranked[0].user_id };
}

// Case 7: ordering by relevance
{
  const a = scoreDiscoverPerson(
    { sector: 'Tecnología', city: 'Malabo', country: 'Guinea Ecuatorial' },
    { sector: 'Tecnología', city: 'Malabo', country: 'Guinea Ecuatorial' },
  );
  const b = scoreDiscoverPerson(
    { sector: 'Comercio', city: 'Madrid', country: 'España' },
    { sector: 'Tecnología', city: 'Malabo', country: 'Guinea Ecuatorial' },
  );
  assert.ok(a > b);
  results.case7_ordering = { ok: true, high: a, low: b };
}

// Case 9: genuinely no eligible peers
{
  const ranked = rankDiscoverPeople(
    [{ user_id: me, full_name: 'Solo yo', is_active: true, setup_complete: true }],
    {},
    { viewerId: me, followedIds: new Set(), role: 'personal' },
  );
  assert.equal(ranked.length, 0);
  results.case9_truly_empty = { ok: true, count: 0 };
}

console.log(JSON.stringify({ ok: true, results }, null, 2));
