// Temporary: repeats the tab-close draft scenario with instrumentation (CI diagnosis).
import { spawn } from 'node:child_process';
import { chromium, firefox, webkit } from 'playwright';
const engine = { chromium, firefox, webkit }[process.env.BROWSER ?? 'chromium'];
const BASE = 'http://localhost:4202/';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', '4202', '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2000));
const browser = await engine.launch();
try {
  for (let n = 0; n < 30; n++) {
    const ctx = await browser.newContext();
    const other = await ctx.newPage();
    await other.goto(`${BASE}#/drills`);
    const p = await ctx.newPage();
    await p.goto(`${BASE}#/drills/rotated-minimum`);
    await p.evaluate(() => {
      const orig = Storage.prototype.setItem;
      let k = 0;
      Storage.prototype.setItem = function (key, v) {
        if (key === 'algotrail:v1') orig.call(this, `probe-set-${k++}-${document.visibilityState}`, String(v).includes('return 5') ? 'has-draft' : 'no-draft');
        return orig.call(this, key, v);
      };
      ['pagehide', 'visibilitychange', 'beforeunload', 'blur'].forEach((t) => addEventListener(t, () => localStorage.setItem(`probe-ev-${t}`, document.querySelector('textarea').value.includes('return 5') ? 'dom-has' : 'dom-not'), true));
    });
    await p.getByLabel('Code for Rotated log').fill('function rotatedMin(a) { return 5; }');
    const t0 = Date.now();
    await p.close({ runBeforeUnload: true });
    const closeMs = Date.now() - t0;
    await other.waitForTimeout(1500);
    const dump = await other.evaluate(() => {
      const code = JSON.parse(localStorage.getItem('algotrail:v1') ?? '{}').drills?.['rotated-minimum']?.code;
      return { saved: code === 'function rotatedMin(a) { return 5; }', probes: Object.keys(localStorage).filter((k) => k.startsWith('probe')).sort().map((k) => `${k}=${localStorage.getItem(k)}`).join(' ') };
    });
    if (!dump.saved || n < 2) console.log(`run ${n}: closeMs=${closeMs} saved=${dump.saved} ${dump.probes}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
