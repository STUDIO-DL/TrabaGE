import { SKILL_SUGGESTIONS } from '../constants/skills';
import { SKILL_EQUIVALENCE_GROUPS } from '../constants/matchingEquivalences';

function stripDiacritics(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toToken(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s#+.-]/g, ' ')
    .replace(/\s+/g, ' ');
}

const canonicalSkillMap = (() => {
  const map = new Map();

  SKILL_SUGGESTIONS.forEach((skill) => {
    map.set(toToken(skill), skill.trim());
  });

  SKILL_EQUIVALENCE_GROUPS.forEach((group) => {
    const [base, ...aliases] = group;
    const canonical =
      map.get(toToken(base))
      || SKILL_SUGGESTIONS.find((item) => toToken(item) === toToken(base))
      || base;

    [base, ...aliases].forEach((name) => {
      map.set(toToken(name), canonical);
    });
  });

  return map;
})();

export function normalizeSkillName(name) {
  const token = toToken(name);
  if (!token) return '';
  return canonicalSkillMap.get(token) || token.split(' ').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function dedupeSkillNames(names = []) {
  const seen = new Set();
  const output = [];

  names.forEach((name) => {
    const normalized = normalizeSkillName(name);
    const key = toToken(normalized);
    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(normalized);
  });

  return output;
}
