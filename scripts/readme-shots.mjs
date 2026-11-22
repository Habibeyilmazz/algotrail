// Retakes the README screenshots in docs/screenshots/ from the running app.
// Usage: npm run build && npm run preview   (in another shell, port 4201)
//        node scripts/readme-shots.mjs [baseUrl]
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4201/';
const out = 'docs/screenshots';
const browser = await chromium.launch();
const errors = [];

async function shot(name, { width = 1440, height = 900, scheme = 'light', scale = 1, route, steps = 0, before, top }) {
  const page = await browser.newPage({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: scale, reducedMotion: 'reduce' });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  await page.goto(`${base}#/${route}`);
  await page.waitForTimeout(300);
  if (before) await before(page);
  for (let i = 0; i < steps; i++) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await page.mouse.move(width - 1, height - 1);
  await page.evaluate((sel) => scrollTo(0, sel ? document.querySelector(sel).getBoundingClientRect().top - 12 : 0), top);
  await page.screenshot({ path: `${out}/${name}.png` });
  await page.close();
}

await shot('visualizer-dijkstra', { route: 'visualize/dijkstra', steps: 24 });
await shot('visualizer-knapsack-dark', { route: 'visualize/knapsack', steps: 30, scheme: 'dark' });
await shot('phone-merge-sort', { route: 'visualize/merge-sort', steps: 32, scheme: 'dark', width: 390, height: 844, scale: 2, top: '.stage' });
await shot('drill', {
  route: 'drills/pair-budget',
  height: 1000,
  before: async (page) => {
    await page.getByRole('button', { name: 'Show a hint' }).click();
    await page.getByRole('textbox', { name: /^Code for/ }).fill(
      'function pairForBudget(prices, budget) {\n  let i = 0, j = prices.length - 1;\n  while (i < j) {\n    const s = prices[i] + prices[j];\n    if (s === budget) return [i, j];\n    if (s < budget) i++;\n    else j--;\n  }\n  return [-1, -1];\n}',
    );
    await page.getByRole('button', { name: /Run tests/ }).click();
    await page.getByText(/All \d+ tests pass/).waitFor();
    await page.locator('.result-summary').blur();
  },
});

await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`saved to ${out}/`);
