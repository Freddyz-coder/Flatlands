// Debug E2E click placement: check which branch the pointerup handler takes.
// window-level pointerup: e.target is the canvas (we saw target===canvas).
import pw from 'playwright-core';
import http from 'http';
import fs from 'fs';

const HTML = fs.readFileSync(new URL('../3dsandbox.html', import.meta.url), 'utf8');
let cdnThree = null;
try { const r = await fetch('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', { signal: AbortSignal.timeout(8000) }); if (r.ok) cdnThree = await r.text(); } catch {}
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(cdnThree ? HTML.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', '<script>' + cdnThree + '</script>').replace('<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>', '<script>window.lucide={createIcons(){}};</script>') : HTML);
}).listen(8899);

const browser = await pw.firefox.launch({ headless: true, executablePath: '/home/freddyz/.cache/ms-playwright/firefox-1543/firefox/firefox', firefoxUserPrefs: { 'dom.webgpu.enabled': true, 'webgl.disabled': false, 'gfx.webrender.software': true, 'layers.acceleration.force': true } });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.text().startsWith('[dbg]')) console.log(m.text()); });
await page.goto('http://localhost:8899/', { waitUntil: 'load' });
await page.waitForTimeout(4500);

await page.click('.item[data-def="tree"]');
await page.waitForTimeout(300);

await page.evaluate(() => {
  // patch placeUserAt — but it's a top-level function declaration in a classic script,
  // so it's a global binding: we can't rebind const/function? function decl IS mutable.
  const orig = placeUserAt;
  placeUserAt = function (tx, tz, quiet) { console.log('[dbg] placeUserAt', tx, tz, quiet); return orig(tx, tz, quiet); };
  // also expose the state we need on window (they're top-level let/const: read via getter trick)
  window.__probe = () => ({ placing: placing ? placing.defId : null, painted, downInfo: downInfo ? { x: downInfo.x, y: downInfo.y, b: downInfo.b } : null });
});
await page.waitForTimeout(200);

const canvas = await page.$('#scene');
const box = await canvas.boundingBox();
const px = box.x + box.width * 0.5, py = box.y + box.height * 0.72;
await page.mouse.move(px, py, { steps: 8 });
await page.waitForTimeout(150);
console.log('pre-down state:', await page.evaluate(() => window.__probe()));
await page.mouse.down(); await page.waitForTimeout(80);
console.log('post-down state:', await page.evaluate(() => window.__probe()));
await page.mouse.up(); await page.waitForTimeout(400);
console.log('post-up state:', await page.evaluate(() => window.__probe()), 'trees:', await page.evaluate(() => objects.filter(o => o.defId === 'tree').length));
console.log('errors:', errors.length);
await browser.close(); server.close(); process.exit(0);
