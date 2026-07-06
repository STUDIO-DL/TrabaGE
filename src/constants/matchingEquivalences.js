/**
 * Deterministic synonym groups for role/profession and skill matching (v1).
 * Tokens within the same group are treated as equivalent during scoring.
 * Future: replace or augment with embedding similarity without changing callers.
 */

export const ROLE_EQUIVALENCE_GROUPS = [
  ['frontend', 'front', 'front-end', 'front end', 'ui', 'react', 'vue', 'angular'],
  ['backend', 'back', 'back-end', 'back end', 'api', 'server', 'node', 'java', 'python'],
  ['fullstack', 'full stack', 'full-stack', 'desarrollador web', 'software developer', 'software engineer'],
  ['developer', 'desarrollador', 'desarrolladora', 'programador', 'programadora', 'engineer', 'ingeniero', 'ingeniera'],
  ['devops', 'sre', 'infraestructura', 'cloud', 'aws', 'azure'],
  ['designer', 'diseñador', 'diseñadora', 'ux', 'ui designer', 'product designer'],
  ['data', 'datos', 'analista', 'analyst', 'bi', 'business intelligence'],
  ['marketing', 'comercial', 'ventas', 'sales', 'account manager'],
  ['contabilidad', 'accounting', 'finanzas', 'finance', 'contable'],
  ['rrhh', 'recursos humanos', 'human resources', 'hr', 'talent'],
  ['soporte', 'support', 'helpdesk', 'it support', 'tecnico', 'técnico'],
];

export const SKILL_EQUIVALENCE_GROUPS = [
  ['javascript', 'js', 'typescript', 'ts', 'ecmascript'],
  ['react', 'reactjs', 'react.js', 'nextjs', 'next.js'],
  ['vue', 'vuejs', 'vue.js', 'nuxt'],
  ['angular', 'angularjs'],
  ['node', 'nodejs', 'node.js', 'express'],
  ['python', 'django', 'flask', 'fastapi'],
  ['java', 'spring', 'springboot', 'kotlin'],
  ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'database', 'bases de datos'],
  ['html', 'css', 'sass', 'scss', 'tailwind'],
  ['figma', 'sketch', 'adobe xd', 'ui design'],
  ['excel', 'spreadsheet', 'hojas de calculo'],
  ['ingles', 'english', 'inglés'],
  ['frances', 'french', 'francés'],
  ['portugues', 'portuguese', 'portugués'],
  ['comunicacion', 'comunicación', 'communication'],
  ['liderazgo', 'leadership', 'team lead'],
  ['agile', 'scrum', 'kanban'],
  ['git', 'github', 'gitlab', 'version control'],
];

function buildEquivalenceMap(groups) {
  const map = new Map();

  groups.forEach((group) => {
    const normalized = group.map((item) => item.toLowerCase().trim());
    normalized.forEach((token) => {
      if (!map.has(token)) map.set(token, new Set());
      normalized.forEach((alias) => map.get(token).add(alias));
    });
  });

  return map;
}

const roleMap = buildEquivalenceMap(ROLE_EQUIVALENCE_GROUPS);
const skillMap = buildEquivalenceMap(SKILL_EQUIVALENCE_GROUPS);

export function expandEquivalentTokens(tokens, map = skillMap) {
  const expanded = new Set();

  tokens.forEach((token) => {
    const key = String(token ?? '').toLowerCase().trim();
    if (!key) return;
    expanded.add(key);
    const aliases = map.get(key);
    if (aliases) aliases.forEach((alias) => expanded.add(alias));
  });

  return expanded;
}

export function tokensMatchWithEquivalents(userToken, jobToken, map = skillMap) {
  const user = String(userToken ?? '').toLowerCase().trim();
  const job = String(jobToken ?? '').toLowerCase().trim();
  if (!user || !job) return false;
  if (user === job) return true;

  const userSet = expandEquivalentTokens([user], map);
  return userSet.has(job);
}

export function countEquivalentMatches(userTokens, jobTokens, map = skillMap) {
  const jobList = [...new Set(jobTokens.filter(Boolean))];
  if (!jobList.length) return 0;

  let matches = 0;
  const matchedJob = new Set();

  userTokens.forEach((userToken) => {
    jobList.forEach((jobToken) => {
      if (matchedJob.has(jobToken)) return;
      if (tokensMatchWithEquivalents(userToken, jobToken, map)) {
        matches += 1;
        matchedJob.add(jobToken);
      }
    });
  });

  return matches;
}
