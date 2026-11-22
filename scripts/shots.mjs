// Usage: node scripts/shots.mjs <outDir> [baseUrl]
// Opens each main screen and saves screenshots, failing on console errors.
import { chromium } from 'playwright';

const out = process.argv[2] ?? 'shots';
const base = process.argv[3] ?? 'http://localhost:4201/';
const browser = await chromium.launch();
const errors = [];
for (const scheme of ['light', 'dark']) {
  for (const [w, h, tag] of [[1440, 900, 'desk'], [390, 844, 'phone']]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: 'reduce' });
    page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}/${scheme}: ${m.text()}`));
    page.on('pageerror', (e) => errors.push(`${tag}/${scheme}: ${e.message}`));
    for (const route of process.argv.slice(4).length ? process.argv.slice(4) : ['', 'visualize/binary-search', 'drills', 'drills/floor-sqrt', 'review']) {
      await page.goto(`${base}#/${route}`);
      await page.waitForTimeout(400);
      const name = `${tag}-${scheme}-${route.replace(/\//g, '_') || 'home'}.png`;
      await page.screenshot({ path: `${out}/${name}`, fullPage: true });
    }
    await page.close();
  }
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no console errors');
