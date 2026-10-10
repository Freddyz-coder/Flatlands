// E2E for the new input behavior changes:
//  1) left-drag does NOT pan;  2) right-drag DOES pan;  3) Ctrl+R rotates the held
//  object and does NOT reload the page;  4) Restart button wipes + re-runs genesis.
import pw from 'playwright-core';
import http from 'http';
import fs from 'fs';

const HTML = fs.readFileSync(new URL('../3dsandbox.html', import.meta.url), 'utf8');
let cdnThree = null;
try { const r = await fetch('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', { signal: AbortSignal.timeout(8000) }); if (r.ok) cdnThree = await r.text(); } catch {}
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(cdnThree ? HTML.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', '<script>' + cdnThree + '</script>').replace('<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>', '<script>window.lucide={createIcons(){}};</script>') : HTML);
}).listen(8897);

const browser = await pw.firefox.launch({
  headless: true,
  executablePath: '/home/freddyz/.cache/ms-playwright/firefox-1543/firefox/firefox',
  firefoxUserPrefs: { 'dom.webgpu.enabled': true, 'webgl.disabled': false, 'gfx.webrender.software': true, 'layers.acceleration.force': true },
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:8897/', { waitUntil: 'load' });
await page.waitForTimeout(4500);

const camTx = () => page.evaluate(() => cam.tx);

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS', n); } else { fail++; console.log('  FAIL', n); } };

const canvas = await page.$('#scene');
const box = await canvas.boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

// 1) left-drag must NOT pan
await page.mouse.move(cx, cy);
await page.mouse.down();
for (let i = 1; i <= 5; i++) await page.mouse.move(cx + i * 30, cy, { steps: 4 });
await page.mouse.up();
await page.waitForTimeout(300);
const txAfterLeftDrag = await camTx();
ok(Math.abs(txAfterLeftDrag - 1) < 2, `left-drag does not pan (cam.tx=${txAfterLeftDrag.toFixed(2)})`);

// 2) right-drag MUST pan
await page.mouse.move(cx, cy);
await page.mouse.down({ button: 'right' });
for (let i = 1; i <= 5; i++) await page.mouse.move(cx + i * 30, cy, { steps: 4 });
await page.mouse.up({ button: 'right' });
await page.waitForTimeout(300);
const txAfterRightDrag = await camTx();
ok(Math.abs(txAfterRightDrag - txAfterLeftDrag) > 5, `right-drag pans (cam.tx ${txAfterLeftDrag.toFixed(2)} -> ${txAfterRightDrag.toFixed(2)})`);

// 3) Ctrl+R while holding a tree rotates it, no reload
await page.click('.item[data-def="tree"]');
await page.waitForTimeout(300);
await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
await page.waitForTimeout(150);
const rotBefore = await page.evaluate(() => placing.rot);
await page.keyboard.press('Control+r');
await page.waitForTimeout(400);
const state = await page.evaluate(() => ({ rot: placing ? placing.rot : null, count: objects.length, restarted: Object.keys(STARTER).length ? true : true }));
ok(state.rot !== null && Math.abs(state.rot - (rotBefore + Math.PI / 4)) < 1e-6, `Ctrl+R rotates the held object (rot ${rotBefore.toFixed(3)} -> ${(state.rot ?? -9).toFixed(3)})`);
ok(state.count >= 97, `no reload happened (objects=${state.count})`);

// 4) Restart button re-runs genesis
await page.keyboard.press('Escape'); // drop held object
await page.click('#gearBtn');
await page.waitForTimeout(200);
await page.click('#restartBtn');
await page.waitForTimeout(100);
await page.click('#restartBtn');    // confirm
await page.waitForTimeout(5000);    // genesis fall time
const afterRestart = await page.evaluate(() => objects.length);
ok(afterRestart === 97, `restart re-runs genesis (objects=${afterRestart})`);
ok(errors.length === 0, `no page/console errors during all of it (${errors.length})`);

console.log(`input e2e: ${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
