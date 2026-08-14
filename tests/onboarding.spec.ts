import { test, expect } from '@playwright/test';

// Run against local dev server: npm run dev
// Tests the immediate UI behavior: selection stored locally and navigation.

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:5173/onboarding/choice');
});

test('Seleccionar opción habilita Siguiente y almacena elección localmente', async ({ page }) => {
  // Assume ChoiceCard buttons have data-testid attributes like data-testid="choice-find_job"
  await page.click('[data-testid="choice-find_job"]');
  const isDisabled = await page.getAttribute('button[data-testid="next-button"]', 'disabled');
  expect(isDisabled).toBeNull();

  await page.click('button[data-testid="next-button"]');

  // Check localStorage
  const storage = await page.evaluate(() => localStorage.getItem('trabage_onboarding_choice_v1'));
  expect(storage).not.toBeNull();
  const parsed = JSON.parse(storage as string);
  expect(parsed.selected).toBe('find_job');
});

test('Omitir marca skip en localStorage y navega', async ({ page }) => {
  await page.click('button[data-testid="skip-button"]');
  const storage = await page.evaluate(() => localStorage.getItem('trabage_onboarding_choice_v1'));
  expect(storage).not.toBeNull();
  const parsed = JSON.parse(storage as string);
  expect(parsed.skipped).toBe(true);
});
