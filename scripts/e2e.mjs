// End-to-end smoke test against the production build.
// Usage: npm run e2e   (builds, then serves dist/ on port 4202)
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4202;
const BASE = `http://localhost:${PORT}/`;
// Run vite's own entry (not npx) so kill() stops the real server process.
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('preview server did not start');
}

const errors = [];
const steps = [];
const step = async (name, fn) => {
  await fn();
  steps.push(name);
  console.log(`ok - ${name}`);
};

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const count = () => page.locator('.step-count').innerText();

  await step('visualizer plays, steps and scrubs with the keyboard', async () => {
    await page.goto(`${BASE}#/visualize/binary-search`);
    assert.equal(await count(), '1/7');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    assert.equal(await count(), '3/7');
    assert.match(await page.locator('.pseudo li.current').innerText(), /mid ← ⌊\(lo \+ hi\) \/ 2⌋/);
    await page.keyboard.press('ArrowLeft');
    assert.equal(await count(), '2/7');
    await page.keyboard.press('End');
    assert.equal(await count(), '7/7');
    assert.match(await page.locator('.note').innerText(), /Found it/);
    await page.keyboard.press('Home');
    await page.keyboard.press('+');
    await page.keyboard.press('+');
    assert.equal(await page.locator('.speed-val').innerText(), '4×');
    await page.keyboard.press(' ');
    await page.waitForFunction(() => document.querySelector('.step-count')?.textContent?.startsWith('7/'), null, { timeout: 5000 });
  });

  await step('visualizer accepts edited input and rejects bad input', async () => {
    await page.getByLabel('Sorted numbers').fill('1 2 x');
    await page.getByRole('button', { name: 'Visualize' }).click();
    assert.match(await page.getByRole('alert').innerText(), /"x" is not a whole number/);
    await page.getByLabel('Sorted numbers').fill('5 10 15 20');
    await page.getByLabel('Target').fill('20');
    await page.getByLabel('Target').press('Control+Enter'); // the documented shortcut, from a one-line field
    await page.getByLabel('Target').blur(); // so End steps the player
    assert.equal(await page.getByRole('alert').count(), 0);
    await page.keyboard.press('End');
    assert.match(await page.locator('.note').innerText(), /a\[3\] = 20/);
  });

  await step('every visualizer renders its example', async () => {
    const links = await page.locator('.viz-list a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    assert.equal(links.length, 18);
    for (const h of links) {
      await page.goto(BASE + h);
      await page.keyboard.press('End');
      assert.ok((await page.locator('.stage .panel').count()) > 0, h);
    }
    await page.goto(`${BASE}#/visualize/no-such-algo`);
    await page.getByRole('heading', { name: 'No such visualizer' }).waitFor();
    assert.equal(await page.locator('.viz-list a').count(), 18, 'the list stays so a wrong link has a way out');
  });

  await step('a correct drill solution passes and is saved', async () => {
    await page.goto(`${BASE}#/drills/floor-sqrt`);
    await page.getByRole('button', { name: 'Show a hint' }).click();
    assert.equal(await page.locator('.hints li').count(), 1);
    await page.getByLabel('Code for Whole square root').fill(
      'function floorSqrt(n) {\n  let r = 0;\n  while ((r + 1) * (r + 1) <= n) r++;\n  return r;\n}',
    );
    await page.getByRole('button', { name: /Run tests/ }).click();
    await page.getByText('All 6 tests pass').waitFor();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('algotrail:v1')).drills['floor-sqrt']);
    assert.equal(saved.solved, true);
    assert.equal(saved.hints, 1);
  });

  await step('a wrong answer shows expected and got', async () => {
    await page.goto(`${BASE}#/drills/first-departure`);
    await page.getByLabel('Code for First departure').fill('function firstDeparture(times, t) { return 0; }');
    await page.keyboard.press('Control+Enter');
    await page.getByText('2 of 5 tests pass').waitFor();
    assert.ok((await page.locator('.case-fail').count()) === 3);
  });

  await step('an infinite loop is stopped by the timeout', async () => {
    await page.getByLabel('Code for First departure').fill('function firstDeparture() { while (true) {} }');
    await page.getByRole('button', { name: /Run tests/ }).click();
    await page.getByText(/Stopped after 3 s/).waitFor({ timeout: 8000 });
    await page.getByLabel('Code for First departure').fill('function firstDeparture( {');
    await page.getByRole('button', { name: /Run tests/ }).click();
    await page.getByText(/Could not run your code/).waitFor();
  });

  await step('offline, a run blames the missing runner, not the code', async () => {
    await page.context().setOffline(true);
    try {
      await page.getByRole('button', { name: /Run tests/ }).click();
      await page.getByText(/The test runner did not load/).waitFor();
    } finally {
      await page.context().setOffline(false);
    }
  });

  await step('code cannot fake a pass, crash the page or flood it with output', async () => {
    await page.getByLabel('Code for First departure').fill(
      'function firstDeparture() {\n  self.postMessage({ type: "case", result: null });\n' +
        '  for (let i = 0; i < 5; i++) self.postMessage({ type: "case", index: i, ok: true, logs: [], ms: 0 });\n' +
        '  self.postMessage({ type: "done" });\n  console.log("y".repeat(5e6));\n  return "x".repeat(5e6);\n}',
    );
    await page.getByRole('button', { name: /Run tests/ }).click();
    await page.getByText('0 of 5 tests pass').waitFor();
    assert.ok((await page.evaluate(() => document.body.innerText.length)) < 100_000);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('algotrail:v1')).drills['first-departure']);
    assert.notEqual(saved.solved, true);
  });

  await step('a draft typed just before leaving the page is kept', async () => {
    await page.goto(`${BASE}#/drills/rotated-minimum`);
    await page.getByLabel('Code for Rotated log').fill('function rotatedMin(a) { return 42; }');
    await page.evaluate(() => (location.hash = '#/drills'));
    await page.getByRole('heading', { name: 'Pattern drills' }).waitFor();
    await page.goto(`${BASE}#/drills/rotated-minimum`);
    assert.equal(await page.getByLabel('Code for Rotated log').inputValue(), 'function rotatedMin(a) { return 42; }');
    // Reset asks first; Playwright dismisses the confirm, so the code stays.
    await page.getByRole('button', { name: 'Reset code' }).click();
    assert.equal(await page.getByLabel('Code for Rotated log').inputValue(), 'function rotatedMin(a) { return 42; }');
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Reset code' }).click();
    assert.match(await page.getByLabel('Code for Rotated log').inputValue(), /^function rotatedMin\(a\) \{\n  \n\}/);
  });

  await step('fast typing after Enter and Tab keeps every key in place', async () => {
    await page.goto(`${BASE}#/drills/rotated-minimum`);
    const editor = page.getByLabel('Code for Rotated log');
    await editor.fill('if (a) {');
    await editor.press('End');
    // A fast typist: the next key arrives before the browser draws a frame.
    for (const key of ['Enter', ...'return 1;', 'Enter', 'Tab', 'x']) await editor.press(key, { delay: 5 });
    assert.equal(await editor.inputValue(), 'if (a) {\n  return 1;\n    x');
  });

  await step('a draft typed just before closing the tab is kept', async () => {
    const ctx = await browser.newContext(); // two tabs sharing one localStorage
    const other = await ctx.newPage();
    await other.goto(`${BASE}#/drills`);
    const p = await ctx.newPage();
    await p.goto(`${BASE}#/drills/rotated-minimum`);
    await p.getByLabel('Code for Rotated log').fill('function rotatedMin(a) { return 5; }');
    await p.close({ runBeforeUnload: true }); // well inside the 400 ms autosave delay, editor still focused
    const saved = await other.evaluate(() => JSON.parse(localStorage.getItem('algotrail:v1') ?? '{}').drills?.['rotated-minimum']?.code);
    assert.equal(saved, 'function rotatedMin(a) { return 5; }');
    await ctx.close();
  });

  await step('a huge paste does not stop the rest of progress from saving', async () => {
    await page.goto(`${BASE}#/drills/rotated-minimum`);
    const editor = page.getByLabel('Code for Rotated log');
    await editor.fill('function rotatedMin(a) { return 1; }');
    await editor.blur();
    await editor.fill('// ' + 'x'.repeat(6_000_000)); // more than localStorage holds
    await page.getByText(/not saved/).waitFor();
    await page.getByRole('button', { name: 'Show a hint' }).click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('algotrail:v1')).drills['rotated-minimum']);
    assert.equal(saved.hints, 1);
    assert.equal(saved.code, 'function rotatedMin(a) { return 1; }', 'the last draft that fits is kept');
  });

  await step('erasing progress right after typing does not bring the draft back', async () => {
    await page.goto(`${BASE}#/drills/rotated-minimum`);
    await page.getByLabel('Code for Rotated log').fill('function rotatedMin(a) { return 7; }');
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Erase my progress' }).click();
    await page.waitForTimeout(800); // longer than the 400 ms draft autosave
    const drills = await page.evaluate(() => JSON.parse(localStorage.getItem('algotrail:v1')).drills);
    assert.deepEqual(drills, {});
  });

  await step('a pending draft is not written back after erasing or importing', async () => {
    // Reset code leaves a draft waiting for the autosave with the editor unfocused, so no blur saves it first;
    // the reload that follows Erase or Import must not let the tab-close save write it (or old progress) back.
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('algotrail:v1')));
    const pendingReset = async () => {
      await page.goto(`${BASE}#/drills/rotated-minimum`);
      const editor = page.getByLabel('Code for Rotated log');
      await editor.fill('function rotatedMin(a) { return 8; }');
      await editor.blur();
      page.once('dialog', (d) => d.accept());
      await page.getByRole('button', { name: 'Reset code' }).click();
    };
    await pendingReset();
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Erase my progress' }).click();
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);
    assert.deepEqual((await stored()).drills, {});

    await pendingReset();
    const progress = { drills: {}, cards: { heap: { ease: 2.5, interval: 1, reps: 1, due: 0 } }, theme: 'system', speed: 1 };
    page.once('dialog', (d) => d.accept());
    await page.getByLabel('Backup file to import').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'algotrail', version: 1, exportedAt: null, progress })) });
    await page.getByRole('status').getByText(/^Imported/).waitFor();
    assert.deepEqual(await stored(), progress);
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Erase my progress' }).click();
    await page.waitForLoadState('load');
  });

  await step('review grades a due card and reschedules it', async () => {
    await page.goto(`${BASE}#/review`);
    await page.getByRole('button', { name: 'Add Two pointers to review' }).click();
    await page.getByRole('heading', { name: 'Two pointers' }).waitFor();
    await page.keyboard.press(' ');
    await page.getByText('Core idea').waitFor();
    await page.keyboard.press('3');
    await page.getByText('Nothing due right now').waitFor();
    const card = await page.evaluate(() => JSON.parse(localStorage.getItem('algotrail:v1')).cards['two-pointers']);
    assert.equal(card.reps, 1);
    assert.ok(card.due > Date.now() + 23 * 3600_000);
  });

  await step('a backup includes code typed just before clicking Export', async () => {
    await page.goto(`${BASE}#/drills/rotated-minimum`);
    await page.getByLabel('Code for Rotated log').fill('function rotatedMin(a) { return 5; }');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export a backup' }).click()]);
    const backup = JSON.parse(readFileSync(await download.path(), 'utf8'));
    assert.equal(backup.progress.drills['rotated-minimum']?.code, 'function rotatedMin(a) { return 5; }');
  });

  await step('a backup can be exported, erased and imported again', async () => {
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('algotrail:v1')));
    const before = await stored();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export a backup' }).click()]);
    assert.match(download.suggestedFilename(), /^algotrail-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const file = await download.path();
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')).progress, before);

    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Erase my progress' }).click();
    await page.waitForLoadState('load');
    assert.deepEqual((await stored()).cards, {});

    const choose = async (files) => {
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Import a backup' }).click()]);
      await chooser.setFiles(files);
    };
    await choose({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"todo": []}') });
    await page.getByRole('status').getByText('Nothing imported. This file is not an algotrail progress backup.').waitFor();

    // Declining the confirm leaves progress alone.
    page.once('dialog', (d) => d.dismiss());
    await choose(file);
    await page.getByRole('status').getByText('Import cancelled. Nothing changed.').waitFor();
    assert.deepEqual((await stored()).cards, {});

    page.once('dialog', (d) => {
      assert.match(d.message(), /Backup: 0 solved drills and 1 pattern in review\.\nThis browser now: 0 solved drills and 0 patterns in review\./);
      d.accept();
    });
    await choose(file);
    await page.getByRole('status').getByText('Imported 0 solved drills and 1 pattern in review.').waitFor();
    assert.deepEqual(await stored(), before);
    // The restored card is listed in the deck, not offered to add again.
    assert.equal(await page.getByRole('button', { name: 'Add Two pointers to review' }).count(), 0);
  });

  await step('theme toggle and shortcut help work from the keyboard', async () => {
    await page.keyboard.press('t');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
    await page.keyboard.press('t');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await page.keyboard.press('?');
    await page.getByRole('heading', { name: 'Keyboard shortcuts' }).waitFor();
    await page.keyboard.press('t'); // shortcuts are off while the dialog is open
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await page.keyboard.press('Escape');
    await page.keyboard.press('d');
    await page.getByRole('heading', { name: 'Pattern drills' }).waitFor();
  });

  await step('the content security policy blocks injected inline scripts', async () => {
    const before = errors.length;
    const blocked = await page.evaluate(
      () =>
        new Promise((resolve) => {
          document.addEventListener('securitypolicyviolation', (e) => resolve(e.violatedDirective), { once: true });
          const s = document.createElement('script');
          s.textContent = 'window.__injected = true';
          document.head.append(s);
          setTimeout(() => resolve(window.__injected ? 'ran' : 'no event'), 1000);
        }),
    );
    assert.match(blocked, /^script-src/);
    // The browser logs the blocked script as a console error; that one is expected.
    errors.splice(before, errors.length - before, ...errors.slice(before).filter((e) => !/Content Security Policy/.test(e)));
  });

  await step('a browser that refuses to save says so', async () => {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('full', 'QuotaExceededError');
      };
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${BASE}#/patterns/heap`);
    assert.equal(await p.getByRole('alert').count(), 0, 'no warning before anything failed');
    await p.getByRole('button', { name: 'Add it now' }).click();
    await p.getByRole('alert').getByText(/not saving your progress/).waitFor();
    await p.getByText(/In your review deck/).waitFor(); // the tab keeps working from memory
    await ctx.close();
  });

  await step('no horizontal scroll at phone width', async () => {
    const phone = await browser.newPage({ viewport: { width: 375, height: 812 } });
    phone.on('pageerror', (e) => errors.push(e.message));
    for (const route of ['', 'visualize/dijkstra', 'visualize/knapsack', 'visualize/merge-sort', 'drills', 'drills/grid-toll', 'review', 'patterns/heap']) {
      await phone.goto(`${BASE}#/${route}`);
      const over = await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(over <= 0, `${route || 'home'} overflows by ${over}px`);
    }
    // The knapsack table is wider than a phone: focused, the arrow keys scroll it instead of stepping.
    await phone.goto(`${BASE}#/visualize/knapsack`);
    await phone.locator('.grid-table').focus();
    await phone.keyboard.press('ArrowRight');
    assert.equal(await phone.locator('.step-count').innerText(), '1/38');
    await phone.waitForFunction(() => document.querySelector('.grid-table').scrollLeft > 0, null, { timeout: 2000 });
    await phone.close();
  });

  assert.deepEqual(errors, [], `console errors: ${errors.join('\n')}`);
  console.log(`\n${steps.length} e2e steps passed`);
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
