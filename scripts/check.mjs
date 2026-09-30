// Abre la escena en un Chrome invisible (el Chrome instalado, sin descargar navegadores),
// guarda una captura y lista los errores de consola. Sale con código 1 si hay errores.
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const URL = process.env.CHECK_URL ?? 'http://localhost:5173';
const OUT = 'screenshots/check.png';
const WAIT_MS = Number(process.env.CHECK_WAIT ?? 4000);

await mkdir('screenshots', { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
const warnings = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
  else if (msg.type() === 'warning') warnings.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('requestfailed', (req) => errors.push(`requestfailed: ${req.url()} (${req.failure()?.errorText})`));

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(WAIT_MS);
  await page.screenshot({ path: OUT });
} catch (e) {
  errors.push(`check: ${e.message}`);
}
await browser.close();

console.log(`Captura: ${OUT}`);
if (warnings.length) {
  console.log(`\nAvisos (${warnings.length}):`);
  for (const w of warnings) console.log(`  - ${w}`);
}
if (errors.length) {
  console.log(`\nErrores de consola (${errors.length}):`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  process.exit(1);
}
console.log('\nSin errores de consola ✓');
