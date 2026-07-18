/**
 * Preview-mode UI smoke test for business verification screen.
 * Usage: node scripts/qa-business-verification-ui.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE_URL = process.argv[2] || 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    sessionStorage.setItem('trabage_preview_mode', 'true');
    sessionStorage.setItem('trabage_preview_role', 'business');
    localStorage.setItem('trabage_onboarding_complete', 'true');
  });
  const page = await context.newPage();
  const results = [];

  const record = (name, pass, note = '') => {
    results.push({ name, pass, note });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}${note ? ` — ${note}` : ''}`);
  };

  await page.goto(`${BASE_URL}/business/verification`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);
  const body = await page.locator('body').innerText();

  record(
    'Trust explanation visible',
    /La verificación ayuda a generar confianza/i.test(body),
  );
  record(
    'Company document block visible',
    /Documento de la empresa/i.test(body),
  );
  record(
    'Representative document block visible',
    /Documento del representante/i.test(body),
  );
  record(
    'NIF / Licencia selector present',
    /NIF/i.test(body) && /Licencia Comercial/i.test(body),
  );
  record(
    'DIP / Pasaporte selector present',
    /DIP/i.test(body) && /Pasaporte/i.test(body),
  );

  await page.getByRole('button', { name: 'Enviar solicitud de verificación' }).click();
  await page.waitForTimeout(500);
  const afterSubmit = await page.locator('body').innerText();
  record(
    'Validation errors when docs missing',
    /Sube el documento de la empresa/i.test(afterSubmit) &&
      /Sube el documento del representante/i.test(afterSubmit),
  );

  await page.goto(`${BASE_URL}/business/profile`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const profileBody = await page.locator('body').innerText();
  record(
    'Profile shows Solicitar verificación in preview',
    /Solicitar verificación/i.test(profileBody),
  );
  record(
    'Owner badge visible in preview header',
    (await page.locator('[role="img"][aria-label*="verificada" i]').count()) > 0,
  );

  await browser.close();
  const failed = results.filter((item) => !item.pass).length;
  console.log(`\nUI summary: ${results.length - failed}/${results.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
