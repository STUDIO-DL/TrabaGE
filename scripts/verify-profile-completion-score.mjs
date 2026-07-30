/**
 * Local unit checks for profile completion scoring (mirrors SQL migration 120).
 * Run: node scripts/verify-profile-completion-score.mjs
 */
import assert from 'node:assert/strict';
import {
  getProfileCompletionScore,
  buildPersonalCompletionSections,
  buildCompanyCompletionSections,
} from '../src/utils/profileCompletionScore.js';

function pass(name) {
  console.log(`PASS ${name}`);
}

// Case 4: missing sector must not throw
{
  const score = getProfileCompletionScore('personal', {
    full_name: 'Ana',
    headline: 'Diseñadora UX',
    about: '',
    sector: null,
    city: '',
    avatar_path: '',
    skills: [],
    experience: [],
    education: [],
  });
  assert.equal(typeof score.percent, 'number');
  assert.equal(score.sufficient, false);
  assert.ok(score.missing_sections.includes('Sector'));
  pass('case4_missing_sector_safe');
}

// Case 5: nearly complete personal → missing sections accurate
{
  const score = getProfileCompletionScore('personal', {
    full_name: 'Luis Pérez',
    avatar_path: 'avatars/x.jpg',
    headline: 'Ingeniero de software',
    about: 'Profesional con experiencia en productos digitales y equipos ágiles.',
    sector: 'Tecnología',
    city: 'Malabo',
    skills: ['JavaScript'],
    experience: [{ position: 'Dev', company: 'Acme', start_date: '2020-01-01' }],
    education: [{ institution: 'UNGE', program: 'Informática' }],
    languages: [{ name: 'Español' }],
    services: [],
    certifications: [],
    projects: [],
    candidate_links: [],
    social_links: {},
  });
  assert.ok(score.percent >= 55);
  assert.equal(score.sufficient, true);
  assert.ok(score.missing_sections.includes('Servicios'));
  assert.ok(score.missing_sections.includes('Certificaciones'));
  pass('case5_near_complete_missing_sections');
}

// Incomplete personal → not sufficient
{
  const score = getProfileCompletionScore('personal', {
    full_name: 'Nuevo',
    headline: '',
    about: '',
  });
  assert.equal(score.sufficient, false);
  assert.ok(score.percent < 55);
  pass('incomplete_personal_not_sufficient');
}

// Case 9: business criteria
{
  const score = getProfileCompletionScore('business', {
    company_name: 'TrabaGE Demo SL',
    logo_path: 'logos/a.png',
    description: 'Empresa de tecnología que conecta talento y oportunidades en Guinea Ecuatorial.',
    sector: 'Tecnología',
    city: 'Malabo',
    website: 'https://example.com',
    social_links: { linkedin: 'https://linkedin.com/x' },
    company_services: [{ name: 'Consultoría' }],
    projects: [{ title: 'App' }],
    cover_path: 'covers/a.jpg',
  });
  assert.equal(score.sufficient, true);
  assert.ok(score.percent >= 55);
  pass('case9_business_sufficient');
}

{
  const score = getProfileCompletionScore('business', {
    company_name: 'Incompleta SA',
    description: 'Corta',
    city: '',
  });
  assert.equal(score.sufficient, false);
  pass('case9_business_incomplete');
}

// Case 10: organization uses company_type instead of sector
{
  const sections = buildCompanyCompletionSections(
    {
      company_name: 'ONG Demo',
      description: 'Organización dedicada a formación profesional y empleo juvenil en la región.',
      company_type: 'ONG',
      city: 'Bata',
      logo_path: 'x',
      website: 'https://ong.example',
      social_links: { x: '1' },
      company_services: [{ name: 'Formación' }],
      projects: [],
      cover_path: '',
    },
    { accountType: 'organization' },
  );
  assert.ok(sections.some((s) => s.key === 'company_type' && s.done));
  assert.ok(sections.some((s) => s.key === 'company_type' && s.label === 'Tipo de organización'));
  const score = getProfileCompletionScore('organization', {
    company_name: 'ONG Demo',
    description: 'Organización dedicada a formación profesional y empleo juvenil en la región.',
    company_type: 'ONG',
    city: 'Bata',
    logo_path: 'x',
    website: 'https://ong.example',
    social_links: { x: '1' },
    company_services: [{ name: 'Formación' }],
    projects: [{ title: 'Curso' }],
    cover_path: 'c',
  });
  assert.equal(score.sufficient, true);
  pass('case10_organization_criteria');
}

// Personal sections builder stability
{
  const sections = buildPersonalCompletionSections({});
  assert.equal(sections.length, 14);
  pass('personal_section_count');
}

console.log('\nAll profile completion score checks passed.');
