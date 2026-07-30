/**
 * Smoke checks for catalog acronym/alias search (Vite SSR loader).
 * Run: node scripts/smoke-catalog-search.mjs
 */
import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({
  root,
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const { INSTITUTIONS } = await server.ssrLoadModule('/src/data/institutions.js');
  const { searchInstitutions, formatCatalogDisplayName } = await server.ssrLoadModule(
    '/src/utils/searchInstitutions.js',
  );
  const { searchOrganizations, getExperienceOrganizations } = await server.ssrLoadModule(
    '/src/utils/searchOrganizations.js',
  );

  const unge = INSTITUTIONS.find((i) => i.id === 'universidad-nacional-de-guinea-ecuatorial');
  if (!unge?.acronym || unge.acronym !== 'UNGE') {
    throw new Error(`Expected UNGE acronym, got ${unge?.acronym}`);
  }
  if (formatCatalogDisplayName(unge) !== 'Universidad Nacional de Guinea Ecuatorial (UNGE)') {
    throw new Error(`Bad display: ${formatCatalogDisplayName(unge)}`);
  }

  const queries = [
    'unge',
    'U.N.G.E',
    'u.n.g.e.',
    'Universidad Nacional',
    'Universidad Nacional de Guinea Ecuatorial',
  ];

  for (const q of queries) {
    const results = searchInstitutions(q, INSTITUTIONS, { limit: 5 });
    if (!results.some((r) => r.id === unge.id)) {
      throw new Error(`Query "${q}" did not return UNGE. Got: ${results.map((r) => r.name).join(' | ')}`);
    }
    if (results[0].id !== unge.id) {
      console.warn(`Warn: "${q}" ranked ${results[0].name} before UNGE`);
    }
  }

  const orgs = getExperienceOrganizations();
  for (const q of ['AJTGE', 'a.j.t.g.e', 'getesa', 'pwc', 'MEGPL']) {
    const hits = searchOrganizations(q, orgs, { limit: 3 });
    if (!hits.length) throw new Error(`Org query "${q}" returned no hits`);
    console.log(`OK org "${q}" →`, hits.map((h) => formatCatalogDisplayName(h)).join(', '));
  }

  console.log('OK education UNGE queries');
  console.log('display:', formatCatalogDisplayName(unge));
  console.log('smoke-catalog-search: passed');
} finally {
  await server.close();
}
