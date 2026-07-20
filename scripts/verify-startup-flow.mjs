/**
 * Verifies startup splash mode decisions for legacy and new users.
 * Run: node scripts/verify-startup-flow.mjs
 */

const FULL_SPLASH_SEEN_KEY = 'trabage_full_splash_seen';
const ONBOARDING_KEY = 'trabage_onboarding_complete';
const AUTH_STORAGE_KEY = 'trabage-auth';
const THEME_STORAGE_KEY = 'trabage_theme';
const INSTALLED_KEY = 'trabage_pwa_installed';

function createEnv(initial = {}, { standalone = false } = {}) {
  const store = { ...initial };
  return {
    store,
    window: {
      localStorage: {
        getItem: (key) => (key in store ? store[key] : null),
        setItem: (key, value) => {
          store[key] = String(value);
        },
      },
      matchMedia: (query) => ({
        matches:
          standalone &&
          (query.includes('display-mode: standalone') || query.includes('display-mode: fullscreen')),
      }),
      navigator: { standalone },
    },
  };
}

function evaluateStartup(env) {
  const { window } = env;
  const read = (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true;

  const isPwaInstalled = isStandalone || read(INSTALLED_KEY) === 'true';
  const hasSeenFullSplash = read(FULL_SPLASH_SEEN_KEY) === 'true';
  const hasLegacyAppUsage =
    read(ONBOARDING_KEY) === 'true' ||
    Boolean(read(AUTH_STORAGE_KEY)) ||
    Boolean(read(THEME_STORAGE_KEY)) ||
    Boolean(read('trabage_search_history'));

  const isReturningUser = isPwaInstalled || hasSeenFullSplash || hasLegacyAppUsage;
  const shouldShowFullSplash = !isReturningUser;

  return {
    isPwaInstalled,
    isReturningUser,
    shouldShowFullSplash,
    mode: shouldShowFullSplash ? 'full' : 'quick',
  };
}

const cases = [
  {
    name: 'brand-new browser visitor',
    env: createEnv(),
    expect: { mode: 'full', isReturningUser: false },
  },
  {
    name: 'legacy PWA opened from home screen (no stored flags)',
    env: createEnv({}, { standalone: true }),
    expect: { mode: 'quick', isPwaInstalled: true, isReturningUser: true },
  },
  {
    name: 'legacy installed user with onboarding only',
    env: createEnv({ [ONBOARDING_KEY]: 'true' }),
    expect: { mode: 'quick', isReturningUser: true },
  },
  {
    name: 'legacy user with expired session (trabage-auth present)',
    env: createEnv({ [AUTH_STORAGE_KEY]: '{"access_token":"x"}' }),
    expect: { mode: 'quick', isReturningUser: true },
  },
  {
    name: 'legacy user with theme preference only',
    env: createEnv({ [THEME_STORAGE_KEY]: 'dark' }),
    expect: { mode: 'quick', isReturningUser: true },
  },
  {
    name: 'returning user with explicit splash flag',
    env: createEnv({ [FULL_SPLASH_SEEN_KEY]: 'true' }),
    expect: { mode: 'quick', isReturningUser: true },
  },
  {
    name: 'browser user who accepted install prompt long ago',
    env: createEnv({ [INSTALLED_KEY]: 'true' }),
    expect: { mode: 'quick', isPwaInstalled: true, isReturningUser: true },
  },
  {
    name: 'legacy PWA + onboarding + no splash flag (real long-time user)',
    env: createEnv(
      {
        [ONBOARDING_KEY]: 'true',
        [AUTH_STORAGE_KEY]: '{"refresh_token":"y"}',
        [THEME_STORAGE_KEY]: 'dark',
      },
      { standalone: true },
    ),
    expect: { mode: 'quick', isPwaInstalled: true, isReturningUser: true },
  },
];

let failed = 0;

for (const testCase of cases) {
  const result = evaluateStartup(testCase.env);
  const mismatches = Object.entries(testCase.expect).filter(([key, value]) => result[key] !== value);

  if (mismatches.length === 0) {
    console.log(`PASS  ${testCase.name}`);
    continue;
  }

  failed += 1;
  console.error(`FAIL  ${testCase.name}`);
  for (const [key, value] of mismatches) {
    console.error(`      expected ${key}=${value}, got ${result[key]}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} startup flow check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${cases.length} startup flow checks passed.`);
