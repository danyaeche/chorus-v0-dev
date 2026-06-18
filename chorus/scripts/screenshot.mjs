import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3210';
const OUT = '/tmp/shots';
mkdirSync(OUT, { recursive: true });

const pages = [
  ['01-dashboard', '/dashboard'],
  ['02-projects', '/projects'],
  ['03-parts', '/parts'],
  ['04-part-detail', '/parts/part-battery-lower'],
  ['05-issues-inbox', '/issues'],
  ['06-issue-detail', '/issues/iss-12'],
  ['07-signoffs', '/parts/part-battery-lower/signoffs'],
  ['08-issue-groups', '/parts/part-battery-lower/issue-groups'],
  ['09-approval', '/parts/part-battery-lower/approval'],
  ['10-supplier-portal', '/supplier/demo-hsinchu-token'],
  ['11-reviewers', '/reviewers'],
  ['12-dfm-detail', '/parts/part-battery-lower/dfm/dfm-hsinchu'],
];

const EXECUTABLE =
  process.env.CHROME_PATH || '/opt/playwright/chromium-1228/chrome-linux64/chrome';
const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

for (const [name, path] of pages) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log('shot', name, path);
}

await browser.close();
console.log('done');
