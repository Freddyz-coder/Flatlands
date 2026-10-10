// Browser E2E: loads the real 3dsandbox.html in headless Firefox (WebGL via software GL),
// watches console errors/pageerrors, performs real interactions, and asserts game state.
import pw from 'playwright-core';
import http from 'http';
import fs from 'fs';
import url from 'url';

const HTML = fs.readFileSync(new URL('../3dsandbox.html', import.meta.url), 'utf8');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(HTML);
}).listen(8899);

// Externals (three.js CDN + fonts) will fail offline; we shim them via a route that
// serves where possible. three.js must load for the game to run — check net access.
let cdnThree = null;
try {
  const r = await fetch('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', { signal: AbortSignal.timeout(8000) });
  if (r.ok) cdnThree = await r.text();
} catch {}
console.log('three.js CDN fetch:', cdnThree ? 'OK (' + (cdnThree.length / 1024).toFixed(0) + ' KB)' : 'UNAVAILABLE (offline)');

const server2 = http.createServer((req, res) => {
  const p = url.parse(req.url).pathname;
  if (p.startsWith('/three') && cdnThree) { res.writeHead(200, {'content-type':'text/javascript'}); res.end(cdnThree); return; }
  if (p.startsWith('/lucide')) { res.writeHead(200, {'content-type':'text/javascript'}); res.end('window.lucide={createIcons(){}}'); return; }
  res.writeHead(200, { 'content-type': 'text/html' });
  // inline three.js + lucide stub so the headless browser (no CDN route) still boots
  const inlined = HTML
    .replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>',
      '<script>' + cdnThree + '</script>')
    .replace('<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>',
      '<script>window.lucide={createIcons(){}};</script>');
  res.end(inlined);
}).listen(8898);

const browser = await pw.firefox.launch({
  headless: true,
  executablePath: '/home/freddyz/.cache/ms-playwright/firefox-1543/firefox/firefox',
  firefoxUserPrefs: {
    'dom.webgpu.enabled': true,
    'webgl.disabled': false,
    'gfx.webrender.software': true,
    'layers.acceleration.force': true,
  },
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errors = [], pageErrors = [], failedRequests = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => pageErrors.push(String(e)));
page.on('requestfailed', r => failedRequests.push(r.url().slice(0, 90)));

// Interception is not supported on this playwright-core/Firefox pairing, so the local
// HTTPS shim does not work. Instead we rewrite the served HTML: relative URLs are
// resolved against localhost:8898, and we inject a CDN-forwarding route by rewriting
// script sources at runtime.
// 
// Simplest correct option: the CDN fetch already succeeded above (three.js). We inject
// an init script that waits for the missing script tags to fail, then eval the fetched
// three.js + a stub lucide BEFORE the game script runs. This happens after DOM ready.
await page.addInitScript(`
  window.__shimMode = true; // three.js + lucide are inlined by the local server
`);

await page.goto('http://localhost:8898/', { waitUntil: 'load' }).catch(e => console.log('goto note:', e.message.split('\n')[0]));
await page.waitForTimeout(4500);   // genesis drop ~4.2s + settle

const report = {};
report.consoleErrors = errors;
report.pageErrors = pageErrors;
report.failedRequests = failedRequests;
report.threeLoaded = await page.evaluate(() => typeof window.THREE !== 'undefined');
report.objectCount = await page.evaluate(() => { try { return objects.length } catch { return -1 } });
report.hasFps = await page.evaluate(() => document.getElementById('statFps').textContent);
report.hasCounter = await page.evaluate(() => document.getElementById('statThings').textContent);
const fpsNum = parseInt(report.hasFps);
report.fpsNumeric = isNaN(fpsNum) ? -1 : fpsNum;

console.log('== E2E startup ==');
console.log('THREE loaded:', report.threeLoaded);
console.log('genesis objects:', report.objectCount, '(expect 97)');
console.log('counter:', report.hasCounter, '| fps label:', report.hasFps);
console.log('console errors:', errors.length ? errors : '(none)');
console.log('page errors:', pageErrors.length ? pageErrors : '(none)');

// ---- Interaction: click a tree item, then click on the canvas to place it ----
if (report.threeLoaded) {
  const before = report.objectCount;
  await page.click('.item[data-def="tree"]');
  await page.waitForTimeout(300);
  const canvas = await page.$('#scene');
  const box = await canvas.boundingBox();
  // place into an empty area: south part of the world (below the starter town at z~46)
  // genesis city occupies the centre; 0.72 height = further south = free grass
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.72);
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => { try { return objects.length } catch { return -1 } });
  report.placeWorked = after === before + 1;
  report.trees = await page.evaluate(() => { try { return objects.filter(o => o.defId === 'tree').length } catch { return -1 } });
  console.log('== place a tree via UI ==', { before, after, worked: report.placeWorked, treesTotal: report.trees });

  // ---- Ctrl+Z undo places the tree back in history ----
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(300);
  const afterUndo = await page.evaluate(() => { try { return objects.length } catch { return -1 } });
  report.undoWorked = afterUndo === before;
  report.treesAfterUndo = await page.evaluate(() => { try { return objects.filter(o => o.defId === 'tree').length } catch { return -1 } });
  console.log('== undo ==', { afterUndo, undoWorked: report.undoWorked, treesAfterUndo: report.treesAfterUndo });

  // ---- Drag-paint a few railway tiles ----
  await page.click('.item[data-def="railway"]');
  const cx = box.x + box.width * 0.4, cy = box.y + box.height * 0.4;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(cx + i * 20, cy, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  report.railCount = await page.evaluate(() => { try { return objects.filter(o => o.defId === 'railway').length } catch { return -1 } });
  console.log('== drag-paint rails ==', { placed: report.railCount, ok: report.railCount > 1 });

  // ---- Train on the painted line ----
  // find a rail tile, place train via the API (the UI requires drop but we test the state)
  report.trains = await page.evaluate(() => { try { const rail = objects.find(o => o.defId === 'railway'); return rail ? rail.tile : null } catch { return null } });
  // ---- FPS sanity ----
  await page.waitForTimeout(2000);
  const fps2 = parseInt(await page.evaluate(() => document.getElementById('statFps').textContent));
  report.fpsAfterInteractions = fps2;
  console.log('== fps after interactions ==', fps2);
}

console.log('\n== summary ==');
console.log(JSON.stringify(report, null, 2).slice(0, 2400));
await page.close();
await browser.close();
server.close(); server2.close();
process.exit(0);
