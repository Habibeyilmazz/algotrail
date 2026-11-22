// Records docs/demo.gif for the README from the running app (needs ffmpeg on PATH).
// Usage: npm run build && npm run preview   (in another shell, port 4201)
//        node scripts/readme-demo.mjs [baseUrl]
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4201/';
const size = { width: 1200, height: 720 };
const dir = mkdtempSync(join(tmpdir(), 'algotrail-demo-'));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: size, recordVideo: { dir, size } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// Quick sort with edited input, played at 2x so the swaps glide.
await page.goto(`${base}#/visualize/quick-sort`);
await page.waitForTimeout(600);
const input = page.getByRole('textbox', { name: /Numbers/ });
await input.fill('');
await input.pressSequentially('42 7 19 88 3 61 25', { delay: 40 });
await input.press('Enter');
await page.locator('.stage').click({ position: { x: 5, y: 5 } }); // leave the input so the player keys work
await page.keyboard.press('+');
await page.keyboard.press(' ');
await page.waitForTimeout(6500);
await page.keyboard.press(' ');
await page.waitForTimeout(600);

// A drill: write a two-pointer solution and run the tests.
await page.goto(`${base}#/drills/pair-budget`);
await page.waitForTimeout(700);
const editor = page.getByRole('textbox', { name: /^Code for/ });
await editor.fill('');
// The editor auto-indents after Enter (keeps the indent, adds two after "{"), so type each line
// without its indent and backspace where the wanted indent is smaller.
const code = 'function pairForBudget(prices, budget) {\n  let i = 0, j = prices.length - 1;\n  while (i < j) {\n    const s = prices[i] + prices[j];\n    if (s === budget) return [i, j];\n    if (s < budget) i++; else j--;\n  }\n  return [-1, -1];\n}';
let auto = 0;
for (const [k, line] of code.split('\n').entries()) {
  const want = line.length - line.trimStart().length;
  if (k > 0) {
    await page.keyboard.press('Enter');
    for (let b = want; b < auto; b++) await page.keyboard.press('Backspace');
  }
  await editor.pressSequentially(line.trimStart(), { delay: 12 });
  auto = want + (line.endsWith('{') ? 2 : 0);
}
await page.keyboard.press('Control+Enter');
await page.getByText(/All \d+ tests pass/).waitFor();
await page.waitForTimeout(2200);

const video = page.video();
await ctx.close();
await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const webm = await video.path();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-vf', 'fps=12,scale=900:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', 'docs/demo.gif']);
rmSync(dir, { recursive: true });
console.log('saved docs/demo.gif');
