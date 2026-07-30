/**
 * Pure eligibility helpers for Descubrir personas (mirrors migration 119 intent).
 * Used to unit-test why the old setup_complete gate emptied the list.
 */

export function isDiscoverPeopleEligible(profile, { viewerId, followedIds = new Set(), role = 'personal' } = {}) {
  if (!profile?.user_id) return { ok: false, reason: 'missing_user_id' };
  if (viewerId && profile.user_id === viewerId) return { ok: false, reason: 'self' };
  if (followedIds.has(profile.user_id)) return { ok: false, reason: 'followed' };
  if (profile.is_active === false) return { ok: false, reason: 'inactive' };
  if (role === 'admin') return { ok: false, reason: 'admin' };
  if (!['personal', 'candidate'].includes(String(role || '').toLowerCase())) {
    return { ok: false, reason: 'non_personal_role' };
  }
  if (!String(profile.full_name || '').trim()) return { ok: false, reason: 'empty_name' };
  return { ok: true, reason: null };
}

/** Old gate that caused empty Discover People for bootstrapped users. */
export function isEligibleUnderLegacySetupCompleteGate(profile, ctx) {
  const base = isDiscoverPeopleEligible(profile, ctx);
  if (!base.ok) return base;
  if (profile.setup_complete !== true) return { ok: false, reason: 'setup_complete_false' };
  return { ok: true, reason: null };
}

export function filterDiscoverPool(profiles, ctx, { requireSetupComplete = false } = {}) {
  const kept = [];
  const excluded = [];
  for (const profile of profiles) {
    const check = requireSetupComplete
      ? isEligibleUnderLegacySetupCompleteGate(profile, ctx)
      : isDiscoverPeopleEligible(profile, ctx);
    if (check.ok) kept.push(profile);
    else excluded.push({ user_id: profile.user_id, reason: check.reason });
  }
  return { kept, excluded };
}

export function scoreDiscoverPerson(candidate, viewer = {}) {
  const sector = String(viewer.sector || '').trim().toLowerCase();
  const city = String(viewer.city || '').trim().toLowerCase();
  const country = String(viewer.country || '').trim().toLowerCase();
  const headline = String(viewer.headline || '').trim().toLowerCase();
  const cSector = String(candidate.sector || '').trim().toLowerCase();
  const cCity = String(candidate.city || '').trim().toLowerCase();
  const cCountry = String(candidate.country || '').trim().toLowerCase();
  const cHeadline = String(candidate.headline || '').trim().toLowerCase();

  let score = 0;
  if (sector && city && cSector === sector && cCity === city) score += 120;
  else if (sector && country && cSector === sector && cCountry === country) score += 90;
  else if (sector && cSector === sector) score += 70;

  if (headline && cHeadline) {
    if (cHeadline === headline) score += 80;
    else if (cHeadline.includes(headline) || headline.includes(cHeadline)) score += 40;
  }

  if (city && cCity === city) score += 30;
  if (country && cCountry === country) score += 15;

  return score;
}

export function rankDiscoverPeople(profiles, viewer, ctx) {
  const { kept } = filterDiscoverPool(profiles, ctx, { requireSetupComplete: false });
  return kept
    .map((p) => ({ ...p, relevance_score: scoreDiscoverPerson(p, viewer) }))
    .sort((a, b) => b.relevance_score - a.relevance_score || String(a.full_name).localeCompare(String(b.full_name)));
}
