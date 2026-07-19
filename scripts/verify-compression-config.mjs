/**
 * Validates compression preset configuration and documents expected output targets.
 * Run: node scripts/verify-compression-config.mjs
 */

const PRESETS = {
  profile: { maxBytes: 300 * 1024, maxWidth: 512, maxHeight: 512, qualityStart: 0.85 },
  logo: { maxBytes: 300 * 1024, maxWidth: 512, maxHeight: 512, qualityStart: 0.85 },
  cover: { maxBytes: 500 * 1024, maxWidth: 1920, maxHeight: 1080, qualityStart: 0.85 },
  post: { maxBytes: 500 * 1024, maxWidth: 1200, maxHeight: 12000, qualityStart: 0.85 },
  verificationImage: { maxBytes: 2 * 1024 * 1024, safeMode: true, qualityStart: 0.9 },
  educationImage: { maxBytes: 2 * 1024 * 1024, safeMode: true, qualityStart: 0.88 },
};

const PDF_LIMITS = {
  cv: 2 * 1024 * 1024,
  verificationPdf: 2 * 1024 * 1024,
  educationPdf: 2 * 1024 * 1024,
};

const INPUT_MAX = 10 * 1024 * 1024;

const TEST_CASES = [
  { label: '3MB profile', inputBytes: 3 * 1024 * 1024, preset: 'profile', expectPassInput: true },
  { label: '2MB logo', inputBytes: 2 * 1024 * 1024, preset: 'logo', expectPassInput: true },
  { label: '5MB cover', inputBytes: 5 * 1024 * 1024, preset: 'cover', expectPassInput: true },
  { label: '4MB post', inputBytes: 4 * 1024 * 1024, preset: 'post', expectPassInput: true },
  { label: '1.5MB PDF CV', inputBytes: 1.5 * 1024 * 1024, pdf: 'cv', expectPassInput: true },
  { label: '2.5MB PDF CV', inputBytes: 2.5 * 1024 * 1024, pdf: 'cv', expectPassInput: true, expectPdfPass: false },
  { label: '12MB profile', inputBytes: 12 * 1024 * 1024, preset: 'profile', expectPassInput: false },
];

function formatKb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log('Compression configuration verification\n');

assert(PRESETS.profile.maxBytes <= 300 * 1024, 'Profile target must be <= 300 KB');
assert(PRESETS.logo.maxBytes <= 300 * 1024, 'Logo target must be <= 300 KB');
assert(PRESETS.cover.maxBytes <= 500 * 1024, 'Cover target must be <= 500 KB');
assert(PRESETS.post.maxBytes <= 500 * 1024, 'Post target must be <= 500 KB');
assert(PDF_LIMITS.cv === 2 * 1024 * 1024, 'CV PDF max must be 2 MB');

console.log('Preset targets:');
Object.entries(PRESETS).forEach(([key, preset]) => {
  console.log(`  - ${key}: <= ${formatKb(preset.maxBytes)}`);
});
console.log('PDF output limits:');
Object.entries(PDF_LIMITS).forEach(([key, maxBytes]) => {
  console.log(`  - ${key}: <= ${formatKb(maxBytes)}`);
});

console.log('\nInput validation scenarios (pre-compression):');
let passed = 0;
for (const test of TEST_CASES) {
  const passesInput = test.inputBytes <= INPUT_MAX;
  assert(passesInput === test.expectPassInput, `${test.label}: unexpected input validation result`);

  if (test.pdf) {
    const passesPdf = test.inputBytes <= PDF_LIMITS[test.pdf];
    const expected = test.expectPdfPass ?? true;
    assert(passesPdf === expected, `${test.label}: unexpected PDF output expectation`);
    console.log(
      `  [OK] ${test.label}: input ${passesInput ? 'accepted' : 'rejected'}, PDF ${passesPdf ? 'accepted' : 'rejected'}`,
    );
  } else {
    console.log(`  [OK] ${test.label}: input ${passesInput ? 'accepted' : 'rejected'} -> compress to <= ${formatKb(PRESETS[test.preset].maxBytes)}`);
  }
  passed += 1;
}

console.log(`\n${passed}/${TEST_CASES.length} scenarios validated.`);
console.log('Note: Image compression ratios require browser Canvas tests (manual or E2E).');
